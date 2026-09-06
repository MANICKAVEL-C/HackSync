import imaplib
import email
from email.header import decode_header
import json
import re
from datetime import datetime

def scan_real_email_inbox(email_user, email_pass, imap_server="imap.gmail.com", port=993, max_emails=50):
    """
    Connects to real IMAP email inbox (Gmail, Outlook, College Webmail)
    and fetches up to max_emails containing competition / hackathon keywords.
    """
    results = []
    try:
        mail = imaplib.IMAP4_SSL(imap_server, port)
        mail.login(email_user, email_pass)
        mail.select("INBOX")

        # Search for hackathon / competition / contest / challenge emails
        status, messages = mail.search(None, 'OR OR OR (BODY "hackathon") (BODY "competition") (BODY "contest") (BODY "challenge")')
        
        if status != "OK" or not messages[0]:
            # Fallback to recent emails if keyword search yields no results
            status, messages = mail.search(None, "ALL")

        email_ids = messages[0].split()
        # Fetch the most recent emails (up to max_emails)
        email_ids = email_ids[-max_emails:]

        for e_id in reversed(email_ids):
            _, msg_data = mail.fetch(e_id, "(RFC822)")
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])

                    # Decode Subject
                    subject, encoding = decode_header(msg["Subject"])[0]
                    if isinstance(subject, bytes):
                        subject = subject.decode(encoding if encoding else "utf-8", errors="ignore")

                    sender = msg.get("From", "College Email")
                    date_str = msg.get("Date", "")

                    # Extract Body Text
                    body = ""
                    if msg.is_multipart():
                        for part in msg.walk():
                            content_type = part.get_content_type()
                            content_disposition = str(part.get("Content-Disposition"))
                            if content_type == "text/plain" and "attachment" not in content_disposition:
                                body_bytes = part.get_payload(decode=True)
                                if body_bytes:
                                    body += body_bytes.decode(errors="ignore") + "\n"
                    else:
                        body_bytes = msg.get_payload(decode=True)
                        if body_bytes:
                            body = body_bytes.decode(errors="ignore")

                    if body.strip():
                        results.append({
                            "subject": subject,
                            "sender": sender,
                            "date": date_str,
                            "body": body
                        })

        mail.logout()
        return {"success": True, "count": len(results), "emails": results}

    except Exception as err:
        return {"success": False, "error": str(err)}

if __name__ == "__main__":
    import sys
    print(json.dumps({"status": "ready"}))
