# 🚀 HackSync Pro — Executive Competition Intelligence & ML Suitability Engine

> **Autonomous College Competition Intelligence System with Natural Language Processing & Google OAuth 2.0 Inbox Scanning**

![HackSync Pro Header](https://img.shields.io/badge/Security-Google_OAuth_2.0_PKCE-purple.svg)
![ML Engine](https://img.shields.io/badge/ML_Engine-TF--IDF_Cosine_Similarity-blue.svg)
![License](https://img.shields.io/badge/License-MIT-emerald.svg)

---

## 📌 Executive Summary

**HackSync Pro** is an intelligent competition discovery and ranking platform designed for engineering students. It continuously scans, extracts, and segregates college competition circulars from Gmail and spreadsheets, scoring each opportunity using a custom **Machine Learning (TF-IDF + Cosine Similarity)** matching engine benchmarked against the user's specific **ECE / Engineering Skills** and **GitHub Project Portfolio**.

---

## 🌟 Key Features

- **🔒 100% Secure Google OAuth 2.0 Inbox Scanner**: Uses official Google Identity Services (GIS) and Gmail REST API v1 with the read-only scope (`https://www.googleapis.com/auth/gmail.readonly`). Zero passwords entered or stored.
- **🧠 Machine Learning Suitability Engine**:
  - **TF-IDF Vectorizer**: Tokenizes email notices, extracts technical keywords, and filters English stopwords.
  - **Cosine Similarity Vector Scoring**: Mathematically calculates domain alignment between user projects/skills and competition requirements.
  - **Composite Urgency Weighting**: Calculates deadline proximity (0-day, 1-3 day, <7 day priority boosts) to ensure imminent registration deadlines rank at the top of the table.
- **📊 Executive Organized Data Table & Card Grid Views**: Dense, high-visibility table listing ML Match %, Title, Source Platform, Registration Deadline, Skills Required, Prize Pool, and direct application links.
- **📂 Spreadsheet & Raw Text Importer**: Drag-and-drop parser supporting Excel (`.xlsx`, `.xls`) and `.csv` files via SheetJS.
- **🔥 "Top 15 Preferred" Smart Scope Filter**: One-click toggle filtering down to the top 15 highest-ranked competitions.
- **🧪 Automated ML Unit Test Suite**: Built-in test runner validating tokenization, term frequency vector calculations, and urgency score boosting.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology Stack |
| :--- | :--- |
| **Frontend Framework** | HTML5, Tailwind CSS, Lucide Icons |
| **Security & Authentication** | Official Google OAuth 2.0 (GIS Client SDK / REST API v1) |
| **ML & Algorithms** | TF-IDF (Term Frequency - Inverse Document Frequency), Cosine Similarity |
| **Data Parsing** | SheetJS (XLSX), Custom Natural Language Processing (NLP) Regex Rules |
| **Backend / Local Server** | Python `http.server` (Zero-cache development headers) |

---

## ⚡ Quick Start Guide

### 1. Clone the Repository
```bash
git clone https://github.com/MANICKAVEL-C/HackSync.git
cd HackSync
```

### 2. Launch the Local Development Server
```bash
python server.py
```

### 3. Open in Browser
Navigate to **`http://localhost:8000`** in your browser.

---

## 🔑 Setting Up Google OAuth 2.0 (Optional for Gmail Inbox Scanning)

To enable live scanning of your college Gmail inbox (`@citchennai.net`):

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named **HackSync**.
3. Navigate to **APIs & Services > OAuth Consent Screen**, select **External**, add your email under **Test Users**, and save.
4. Go to **Credentials > + Create Credentials > OAuth Client ID**.
5. Select **Web Application**, and add the following under **Authorized JavaScript Origins**:
   - `http://localhost:8000`
   - `http://127.0.0.1:8000`
6. Copy your generated **Client ID** and update `defaultClientId` in `js/oauthGmail.js`.

---

## 🧪 Running ML Unit Tests

To run the automated test suite for the `MLPredictor` engine:

Open **`http://localhost:8000/tests/runner.html`** in your browser to inspect real-time test assertions for tokenization, cosine similarity, skill matching, and urgency boosting.

---

## 🛡️ Cyber Security & Privacy Guarantee

- **Zero Password Risk**: Standard IMAP/raw passwords are **never** requested, stored, or transmitted.
- **Session-Only Tokens**: Access tokens obtained via Google OAuth 2.0 are retained strictly in `sessionStorage` for the active session and are cleared automatically upon tab close.
- **Client-Side Processing**: All ML vector calculations, spreadsheet parsing, and text extractions execute 100% locally inside the browser DOM.

---

## 📜 License

Distributed under the MIT License. Created by **Manickavel C**.
