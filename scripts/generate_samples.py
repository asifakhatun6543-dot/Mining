import os
import fitz
from PIL import Image, ImageDraw, ImageFont

def generate_samples():
    sample_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_docs"))
    os.makedirs(sample_dir, exist_ok=True)

    # 1. Digital Sample PDF
    digital_path = os.path.join(sample_dir, "sample_digital_contract.pdf")
    doc = fitz.open()
    
    # Page 1
    p1 = doc.new_page(width=612, height=792)
    # Header
    p1.insert_text((50, 60), "CONSULTING SERVICES AGREEMENT", fontsize=16, fontname="helv", color=(0.1, 0.2, 0.4))
    p1.insert_text((50, 80), "Document Reference: CSA-2026-X89", fontsize=10, fontname="helv", color=(0.4, 0.4, 0.4))
    
    # Section 1
    p1.insert_text((50, 115), "1. PARTIES AND EFFECTIVE DATE", fontsize=12, fontname="helv", color=(0.15, 0.15, 0.15))
    p1.insert_text((50, 135), "This Agreement is entered into on October 16, 2026, by and between:", fontsize=10, fontname="times-roman")
    p1.insert_text((65, 155), "Client: Apex Innovations Inc. (hereinafter referred to as Client)", fontsize=10, fontname="helv")
    p1.insert_text((65, 175), "Consultant: Dr. Alexander Morgan, Lead Systems Architect", fontsize=10, fontname="helv")

    # Section 2
    p1.insert_text((50, 210), "2. SCOPE OF SERVICES & DELIVERABLES", fontsize=12, fontname="helv", color=(0.15, 0.15, 0.15))
    p1.insert_text((50, 230), "Consultant shall provide advanced technical advisory, software architecture reviews,", fontsize=10, fontname="times-roman")
    p1.insert_text((50, 248), "and security hardening for the core distributed computing cluster.", fontsize=10, fontname="times-roman")

    # Section 3: Financial & Sensitive Data (Great for redaction demo)
    p1.insert_text((50, 285), "3. COMPENSATION AND CONFIDENTIAL BANKING", fontsize=12, fontname="helv", color=(0.15, 0.15, 0.15))
    p1.insert_text((50, 305), "Client agrees to pay a fixed retainer fee of $12,500.00 USD per calendar month.", fontsize=10, fontname="helv")
    p1.insert_text((50, 325), "Wire Transfer Routing: ABA 021000021, Account Number: 84920491029.", fontsize=10, fontname="courier")
    p1.insert_text((50, 345), "Tax Identification Number (SSN/EIN): 94-8201948.", fontsize=10, fontname="courier")

    # Section 4: Multilingual & International
    p1.insert_text((50, 385), "4. INTERNATIONAL JURISDICTION", fontsize=12, fontname="helv", color=(0.15, 0.15, 0.15))
    p1.insert_text((50, 405), "Applicable in Geneva and Montreal: Bureau prive, accord confirme.", fontsize=10, fontname="times-roman")
    
    # Signature box
    p1.insert_text((50, 470), "CLIENT SIGNATURE: _______________________", fontsize=10, fontname="helv")
    p1.insert_text((320, 470), "CONSULTANT SIGNATURE: ___________________", fontsize=10, fontname="helv")

    # Page 2: Summary Specifications
    p2 = doc.new_page(width=612, height=792)
    p2.insert_text((50, 60), "EXHIBIT A: SYSTEM ARCHITECTURE SPECIFICATIONS", fontsize=14, fontname="helv", color=(0.1, 0.2, 0.4))
    p2.insert_text((50, 95), "Target throughput: 50,000 requests/sec with latency < 15ms.", fontsize=10, fontname="helv")
    p2.insert_text((50, 115), "Primary datacenter region: US-East (Northern Virginia) and EU-Central (Frankfurt).", fontsize=10, fontname="helv")
    p2.insert_text((50, 135), "Backup redundancy: Dual active-passive geo-replicated clusters.", fontsize=10, fontname="helv")

    doc.save(digital_path)
    doc.close()
    print("Created digital sample:", digital_path)

    # 2. Scanned Sample PDF
    scanned_path = os.path.join(sample_dir, "sample_scanned_receipt.pdf")
    
    # Generate realistic scanned document image with mild paper texture and scan artifact
    w, h = 850, 1100
    img = Image.new("RGB", (w, h), color=(247, 246, 241))  # realistic scan paper
    draw = ImageDraw.Draw(img)

    # Header / Invoice
    draw.text((100, 100), "METROPOLITAN SUPPLY CO. - OFFICIAL RECEIPT", fill=(30, 30, 30))
    draw.line([(100, 130), (750, 130)], fill=(80, 80, 80), width=2)

    draw.text((100, 160), "ORDER ID: ORD-99214-X", fill=(35, 35, 35))
    draw.text((100, 190), "DATE: 2026-10-12", fill=(35, 35, 35))
    draw.text((100, 220), "CUSTOMER: ACME CORPORATION", fill=(35, 35, 35))

    draw.text((100, 280), "DESCRIPTION", fill=(40, 40, 40))
    draw.text((450, 280), "QTY", fill=(40, 40, 40))
    draw.text((600, 280), "AMOUNT", fill=(40, 40, 40))
    draw.line([(100, 305), (750, 305)], fill=(120, 120, 120), width=1)

    draw.text((100, 330), "High-Capacity Server Rack Chassis 42U", fill=(45, 45, 45))
    draw.text((460, 330), "2", fill=(45, 45, 45))
    draw.text((600, 330), "$2,400.00", fill=(45, 45, 45))

    draw.text((100, 370), "Managed Gigabit Ethernet Switch 48-Port", fill=(45, 45, 45))
    draw.text((460, 370), "4", fill=(45, 45, 45))
    draw.text((600, 370), "$1,850.00", fill=(45, 45, 45))

    draw.text((100, 410), "Uninterruptible Power Supply (UPS) 3000VA", fill=(45, 45, 45))
    draw.text((460, 410), "1", fill=(45, 45, 45))
    draw.text((600, 410), "$980.00", fill=(45, 45, 45))

    draw.line([(100, 450), (750, 450)], fill=(120, 120, 120), width=1)
    draw.text((460, 480), "TOTAL DUE:", fill=(30, 30, 30))
    draw.text((600, 480), "$5,230.00", fill=(20, 20, 20))

    draw.text((100, 560), "PAYMENT STATUS: PENDING VERIFICATION", fill=(120, 30, 30))
    draw.text((100, 600), "AUTHORIZED BY: AUDIT OFFICER M. RAMIREZ", fill=(40, 40, 40))

    # Stamp outline
    draw.rectangle([(480, 580), (720, 660)], outline=(140, 30, 30), width=2)
    draw.text((510, 605), "VERIFIED & AUDITED", fill=(140, 30, 30))
    draw.text((540, 625), "BRANCH #04", fill=(140, 30, 30))

    scan_img_path = os.path.join(sample_dir, "temp_scan.png")
    img.save(scan_img_path)

    doc_scan = fitz.open()
    p = doc_scan.new_page(width=612, height=792)
    p.insert_image(p.rect, filename=scan_img_path)
    doc_scan.save(scanned_path)
    doc_scan.close()
    if os.path.exists(scan_img_path):
        os.remove(scan_img_path)
    print("Created scanned sample:", scanned_path)

if __name__ == "__main__":
    generate_samples()
