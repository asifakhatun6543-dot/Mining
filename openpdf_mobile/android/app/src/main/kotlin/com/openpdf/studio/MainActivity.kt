package com.openpdf.studio

import android.content.ContentValues
import android.content.Intent
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.annotation.NonNull
import androidx.core.content.FileProvider
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.io.FileOutputStream

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.openpdf.studio/file_export"

    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "exportToDownloads" -> {
                    try {
                        val fileName = call.argument<String>("fileName") ?: "Document.pdf"
                        val bytes = call.argument<ByteArray>("bytes")
                        val mimeType = call.argument<String>("mimeType") ?: "application/pdf"
                        val subfolder = call.argument<String>("subfolder") ?: "Download/PDF WITH LOVE"

                        if (bytes == null || bytes.isEmpty()) {
                            result.error("EMPTY_BYTES", "File bytes cannot be null or empty", null)
                            return@setMethodCallHandler
                        }

                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            // Android 10+ (API 29+): Scoped Storage with MediaStore.Downloads
                            val formattedSubfolder = if (subfolder.endsWith("/")) subfolder else "$subfolder/"
                            val contentValues = ContentValues().apply {
                                put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                                put(MediaStore.Downloads.MIME_TYPE, mimeType)
                                put(MediaStore.Downloads.RELATIVE_PATH, formattedSubfolder)
                                put(MediaStore.Downloads.IS_PENDING, 1)
                            }

                            val contentResolver = applicationContext.contentResolver
                            val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                                ?: throw IllegalStateException("Failed to create MediaStore entry in Downloads")

                            contentResolver.openOutputStream(uri, "w")?.use { outputStream ->
                                outputStream.write(bytes)
                                outputStream.flush()
                            } ?: throw IllegalStateException("Failed to open output stream for MediaStore URI: $uri")

                            contentValues.clear()
                            contentValues.put(MediaStore.Downloads.IS_PENDING, 0)
                            contentResolver.update(uri, contentValues, null, null)

                            val displayPath = "$formattedSubfolder$fileName"

                            result.success(mapOf(
                                "success" to true,
                                "uri" to uri.toString(),
                                "displayPath" to displayPath,
                                "fileName" to fileName,
                                "bytesWritten" to bytes.size
                            ))
                        } else {
                            // Android 9 and lower: Public Downloads Directory Fallback
                            val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                            val targetDir = File(downloadsDir, "PDF WITH LOVE")
                            if (!targetDir.exists()) {
                                targetDir.mkdirs()
                            }

                            // Duplicate file resolution
                            var targetFile = File(targetDir, fileName)
                            if (targetFile.exists()) {
                                val dotIndex = fileName.lastIndexOf('.')
                                val baseName = if (dotIndex > 0) fileName.substring(0, dotIndex) else fileName
                                val ext = if (dotIndex > 0) fileName.substring(dotIndex) else ""
                                var counter = 1
                                while (targetFile.exists()) {
                                    targetFile = File(targetDir, "$baseName ($counter)$ext")
                                    counter++
                                }
                            }

                            FileOutputStream(targetFile).use { outputStream ->
                                outputStream.write(bytes)
                                outputStream.flush()
                            }

                            MediaScannerConnection.scanFile(
                                applicationContext,
                                arrayOf(targetFile.absolutePath),
                                arrayOf(mimeType),
                                null
                            )

                            val uri = Uri.fromFile(targetFile)
                            result.success(mapOf(
                                "success" to true,
                                "uri" to uri.toString(),
                                "filePath" to targetFile.absolutePath,
                                "displayPath" to "Download/PDF WITH LOVE/${targetFile.name}",
                                "fileName" to targetFile.name,
                                "bytesWritten" to bytes.size
                            ))
                        }
                    } catch (e: Exception) {
                        result.error("EXPORT_FAILED", e.localizedMessage ?: "Unknown export error", null)
                    }
                }

                "openFile" -> {
                    try {
                        val uriString = call.argument<String>("uriString")
                        val filePath = call.argument<String>("filePath")
                        val mimeType = call.argument<String>("mimeType") ?: "*/*"

                        val uri: Uri = when {
                            !uriString.isNullOrEmpty() && uriString.startsWith("content://") -> {
                                Uri.parse(uriString)
                            }
                            !filePath.isNullOrEmpty() -> {
                                val file = File(filePath)
                                if (!file.exists()) {
                                    result.error("FILE_NOT_FOUND", "File does not exist: $filePath", null)
                                    return@setMethodCallHandler
                                }
                                FileProvider.getUriForFile(applicationContext, "${applicationContext.packageName}.fileprovider", file)
                            }
                            !uriString.isNullOrEmpty() && uriString.startsWith("file://") -> {
                                val file = File(Uri.parse(uriString).path ?: "")
                                FileProvider.getUriForFile(applicationContext, "${applicationContext.packageName}.fileprovider", file)
                            }
                            else -> {
                                result.error("INVALID_ARGS", "Missing valid uriString or filePath", null)
                                return@setMethodCallHandler
                            }
                        }

                        val intent = Intent(Intent.ACTION_VIEW).apply {
                            setDataAndType(uri, mimeType)
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }

                        val resolved = applicationContext.packageManager.queryIntentActivities(intent, 0)
                        if (resolved.isNotEmpty()) {
                            applicationContext.startActivity(intent)
                            result.success(true)
                        } else {
                            // Fallback to generic mime type if specific handler not found
                            intent.setDataAndType(uri, "*/*")
                            applicationContext.startActivity(intent)
                            result.success(true)
                        }
                    } catch (e: Exception) {
                        result.error("OPEN_FAILED", e.localizedMessage ?: "Could not open file", null)
                    }
                }

                "shareFile" -> {
                    try {
                        val uriString = call.argument<String>("uriString")
                        val filePath = call.argument<String>("filePath")
                        val mimeType = call.argument<String>("mimeType") ?: "*/*"
                        val title = call.argument<String>("title") ?: "Share Document"

                        val uri: Uri = when {
                            !uriString.isNullOrEmpty() && uriString.startsWith("content://") -> {
                                Uri.parse(uriString)
                            }
                            !filePath.isNullOrEmpty() -> {
                                val file = File(filePath)
                                FileProvider.getUriForFile(applicationContext, "${applicationContext.packageName}.fileprovider", file)
                            }
                            !uriString.isNullOrEmpty() && uriString.startsWith("file://") -> {
                                val file = File(Uri.parse(uriString).path ?: "")
                                FileProvider.getUriForFile(applicationContext, "${applicationContext.packageName}.fileprovider", file)
                            }
                            else -> {
                                result.error("INVALID_ARGS", "Missing valid uriString or filePath", null)
                                return@setMethodCallHandler
                            }
                        }

                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = mimeType
                            putExtra(Intent.EXTRA_STREAM, uri)
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        }
                        val chooser = Intent.createChooser(shareIntent, title).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        applicationContext.startActivity(chooser)
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("SHARE_FAILED", e.localizedMessage ?: "Could not share file", null)
                    }
                }

                "checkFileExists" -> {
                    try {
                        val uriString = call.argument<String>("uriString")
                        val filePath = call.argument<String>("filePath")

                        val exists = when {
                            !uriString.isNullOrEmpty() && uriString.startsWith("content://") -> {
                                try {
                                    val fd = applicationContext.contentResolver.openFileDescriptor(Uri.parse(uriString), "r")
                                    val size = fd?.statSize ?: 0L
                                    fd?.close()
                                    size > 0
                                } catch (_: Exception) {
                                    false
                                }
                            }
                            !filePath.isNullOrEmpty() -> {
                                val f = File(filePath)
                                f.exists() && f.length() > 0
                            }
                            else -> false
                        }
                        result.success(exists)
                    } catch (e: Exception) {
                        result.error("CHECK_FAILED", e.localizedMessage, null)
                    }
                }

                else -> result.notImplemented()
            }
        }
    }
}
