---
name: coding-opencode
description: Memungkinkan penggunaan agen pengkodean OpenCode yang telah dikustomisasi dengan "Oh My OpenCode" untuk tugas pengembangan kode yang kompleks, eksplorasi codebase, debugging, refactoring, dan orkestrasi multi-model. Gunakan skill ini ketika Anda membutuhkan bantuan coding AI yang otonom dan canggih, terutama saat Anda ingin memanfaatkan fitur-fitur "Oh My OpenCode" seperti agen Sisyphus, Hephaestus, Oracle, Librarian, atau Explorer, serta alat LSP/AST.
---

# Skill: coding-opencode

Skill ini dirancang untuk memanfaatkan kemampuan penuh dari instalasi OpenCode Anda yang telah dikustomisasi dengan "Oh My OpenCode". Ini memberikan akses ke orkestrasi multi-agen yang canggih, alat pengembangan yang terintegrasi, dan alur kerja otomatis untuk menyelesaikan tugas-tugas pengkodean.

## Kapan Menggunakan Skill Ini

Gunakan `coding-opencode` ketika Anda:

- Membutuhkan bantuan AI untuk menulis atau memodifikasi kode.
- Perlu melakukan eksplorasi codebase yang mendalam.
- Membutuhkan bantuan untuk debugging atau refactoring.
- Ingin memanfaatkan agen khusus seperti Frontend UI/UX Engineer atau Oracle.
- Berencana untuk melakukan tugas pengembangan yang membutuhkan beberapa langkah dan koordinasi antar agen.
- Ingin mengaktifkan mode "ultrawork" atau "ulw" untuk eksekusi tugas yang otonom dan berkelanjutan.

## Fitur Utama Melalui "Oh My OpenCode"

"Oh My OpenCode" menghadirkan beberapa agen dan fitur canggih ke OpenCode Anda:

- **Sisyphus (Main Agent)**: Mengorkestrasi agen-agen lain untuk memastikan tugas diselesaikan sampai tuntas.
- **Hephaestus (Autonomous Deep Worker)**: Agen otonom yang berorientasi pada tujuan untuk eksekusi mendalam.
- **Oracle (Design & Debugging)**: Agen spesialis untuk membantu dalam desain dan proses debugging.
- **Librarian (Docs & Codebase Exploration)**: Agen untuk mencari dokumentasi dan menjelajahi codebase.
- **Explore (Fast Codebase Grep)**: Untuk eksplorasi codebase yang sangat cepat.
- **LSP & AST Tools**: Dukungan penuh untuk Language Server Protocol (LSP) dan Abstract Syntax Tree (AST) untuk refactoring yang lebih akurat dan aman.
- **Multi-model Orchestration**: Memungkinkan penggunaan berbagai model AI yang berbeda, masing-masing dioptimalkan untuk tugas tertentu.
- **`ultrawork` / `ulw` Keyword**: Cukup sertakan `ultrawork` atau `ulw` dalam perintah Anda untuk mengaktifkan alur kerja otomatis penuh yang memanfaatkan semua agen dan fitur "Oh My OpenCode".

## Cara Menggunakan

Untuk menggunakan skill ini, Anda dapat memanggil perintah OpenCode melalui tool `exec`, dan menyertakan instruksi serta argumen yang diperlukan. Jika Anda ingin mengaktifkan orkestrasi penuh dari "Oh My OpenCode", pastikan untuk menyertakan `ultrawork` atau `ulw` dalam _prompt_ atau argumen Anda.

**Contoh Umum:**

```bash
# Untuk memulai sesi OpenCode dengan mode ultrawork
opencode --agent build --ultrawork "Buatkan sebuah fungsi Python untuk menghitung deret Fibonacci"

# Untuk meminta agen Librarian mencari informasi tentang suatu API
opencode --agent build "ulw: Cari dokumentasi untuk API 'requests' Python dan berikan contoh penggunaan dasar."

# Untuk refactoring kode
opencode --agent build "ulw: Refactor file 'src/main.js' agar menggunakan async/await."
```

**Perhatikan:** Perintah `opencode` di atas adalah contoh. Karena OpenCode diinstal di **WSL** dan dijalankan via **PowerShell**, setiap perintah OpenCode perlu diawali dengan `wsl`.
Contoh: `wsl opencode ...`

**Target Folder:** Semua operasi pengkodean atau manipulasi file akan menargetkan `C:\Users\Administrator\Documents\Jagonyakomputer` sebagai _working directory_ utama secara default, kecuali jika ditentukan lain.

**Integrasi Docker:** Agent memiliki kemampuan untuk mengoperasikan Docker container via PowerShell, jika diperlukan untuk tugas yang melibatkan containerisasi atau lingkungan pengembangan terisolasi.

## Konfigurasi

"Oh My OpenCode" sangat dapat dikustomisasi. Konfigurasi dapat ditemukan di:

- `.opencode/oh-my-opencode.json` (untuk proyek)
- `~/.config/opencode/oh-my-opencode.json` (untuk pengguna)

Anda dapat mengubah model yang digunakan oleh agen tertentu, suhu, _prompt_, dan izin di file konfigurasi ini.

Jika Anda perlu melakukan konfigurasi spesifik atau mengatasi masalah, saya akan merujuk ke dokumentasi "Oh My OpenCode" atau file konfigurasi tersebut.
