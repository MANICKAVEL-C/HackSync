/**
 * Email Sync Module — Real IMAP Email Account Fetcher & Bulk Email Parser
 */

const EmailSyncModule = {
  
  /**
   * Connect to real IMAP email server (Gmail, Outlook, College Webmail)
   */
  async scanRealIMAPInbox(email, password, server = 'imap.gmail.com', port = 993, maxEmails = 50) {
    const response = await fetch('/api/scan-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        server,
        port,
        max_emails: maxEmails
      })
    });

    if (!response.ok) {
      throw new Error('Failed to connect to email server. Please check IMAP settings or password.');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Email authentication or IMAP connection failed.');
    }

    const allHackathons = [];
    if (Array.isArray(data.emails)) {
      data.emails.forEach((mail, idx) => {
        const parsedList = ImporterModule.parseRawText(mail.body);
        if (parsedList && parsedList.length > 0) {
          parsedList.forEach(h => {
            allHackathons.push({
              ...h,
              platform: 'College Email / IMAP',
              emailSubject: mail.subject,
              emailSender: mail.sender
            });
          });
        } else if (mail.subject && mail.subject.length > 5) {
          // Subject fallback if body parsing was minimal
          allHackathons.push({
            id: 'real_mail_' + Date.now() + '_' + idx,
            title: mail.subject.replace(/^(fwd|fw|re):\s*/i, '').trim(),
            platform: 'College Email / IMAP',
            deadline: ImporterModule.normalizeDate(mail.body, idx),
            skills: ImporterModule.detectDomainCategory(mail.subject + ' ' + mail.body),
            eligibility: 'All Engineering Students',
            prize: 'Certificates & Rewards',
            link: '#',
            description: mail.body.substring(0, 300) || mail.subject
          });
        }
      });
    }

    return allHackathons;
  }
};
