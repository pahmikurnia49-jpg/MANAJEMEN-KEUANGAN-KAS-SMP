// ==========================================
// 1. STATE & VARIABEL GLOBAL
// ==========================================
let transactions = JSON.parse(localStorage.getItem('kas_transactions')) || [];
let categories = JSON.parse(localStorage.getItem('kas_categories')) || ['SPP', 'BOS', 'Sumbangan', 'Alat Tulis', 'Gaji Guru', 'Operasional', 'Lainnya'];
let kasChartInstance = null; // Simpan instance grafik

// Elemen DOM
const loginView = document.getElementById('login-container');
const dashboardView = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const transactionForm = document.getElementById('transaction-form');
const tableBody = document.getElementById('table-body');

// ==========================================
// 2. INISIALISASI & LOGIN LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Cek status login
    if(localStorage.getItem('kas_isLoggedIn') === 'true') {
        showDashboard();
    }

    // Set tanggal hari ini sebagai default di form
    document.getElementById('date').valueAsDate = new Date();
    
    // Render dropdown kategori awal
    renderCategoryDropdown();
    
    // Atur Dark Mode dari preferensi sebelumnya
    if(localStorage.getItem('kas_darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }
});

// Proses Login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;

    // Hardcoded Validasi
    if(user === 'admin' && pass === 'admin123') {
        localStorage.setItem('kas_isLoggedIn', 'true');
        showDashboard();
    } else {
        alert('Username atau Password salah! (Gunakan: admin / admin123)');
    }
});

// Lupa Password
document.getElementById('forgot-password').addEventListener('click', (e) => {
    e.preventDefault();
    alert('Silakan hubungi Administrator IT sekolah untuk mereset password Anda.');
});

// Logout
document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('kas_isLoggedIn');
    loginView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
    loginForm.reset();
});

function showDashboard() {
    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    updateUI();
}

// ==========================================
// 3. LOGIKA TRANSAKSI (CRUD)
// ==========================================
transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const id = document.getElementById('edit-id').value;
    const type = document.getElementById('type').value;
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const person = document.getElementById('person').value;

    if(id) {
        // Mode Edit
        const index = transactions.findIndex(t => t.id == id);
        transactions[index] = { id: parseInt(id), type, date, description, amount, category, person };
        document.getElementById('form-title').innerText = 'Tambah Transaksi';
        document.getElementById('btn-cancel-edit').style.display = 'none';
        document.getElementById('edit-id').value = '';
    } else {
        // Mode Tambah Baru
        const newTransaction = {
            id: Date.now(),
            type, date, description, amount, category, person
        };
        transactions.push(newTransaction);
    }

    saveData();
    transactionForm.reset();
    document.getElementById('date').valueAsDate = new Date(); // Reset tanggal ke hari ini
    updateUI();
});

// Tambah Kategori Custom
document.getElementById('btn-add-category').addEventListener('click', () => {
    const newCat = prompt('Masukkan nama kategori baru:');
    if(newCat && newCat.trim() !== '') {
        categories.push(newCat.trim());
        localStorage.setItem('kas_categories', JSON.stringify(categories));
        renderCategoryDropdown();
        // Set dropdown ke kategori yang baru ditambah
        document.getElementById('category').value = newCat.trim();
    }
});

function renderCategoryDropdown() {
    const select = document.getElementById('category');
    select.innerHTML = '';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

function deleteTransaction(id) {
    if(confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        updateUI();
    }
}

function editTransaction(id) {
    const trx = transactions.find(t => t.id === id);
    if(trx) {
        document.getElementById('edit-id').value = trx.id;
        document.getElementById('type').value = trx.type;
        document.getElementById('date').value = trx.date;
        document.getElementById('description').value = trx.description;
        document.getElementById('amount').value = trx.amount;
        document.getElementById('category').value = trx.category;
        document.getElementById('person').value = trx.person;

        document.getElementById('form-title').innerText = 'Edit Transaksi';
        document.getElementById('btn-cancel-edit').style.display = 'inline-block';
    }
}

document.getElementById('btn-cancel-edit').addEventListener('click', () => {
    transactionForm.reset();
    document.getElementById('date').valueAsDate = new Date();
    document.getElementById('edit-id').value = '';
    document.getElementById('form-title').innerText = 'Tambah Transaksi';
    document.getElementById('btn-cancel-edit').style.display = 'none';
});

// ==========================================
// 4. RENDER UI & KALKULASI
// ==========================================
function updateUI() {
    renderTable();
    updateSummary();
    renderChart();
}

function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
}

function renderTable() {
    tableBody.innerHTML = '';
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const filterType = document.getElementById('filter-type').value;

    // Filter array data berdasarkan search dan tipe
    const filteredData = transactions.filter(t => {
        const matchSearch = t.description.toLowerCase().includes(searchTerm) || t.person.toLowerCase().includes(searchTerm);
        const matchType = filterType === 'semua' || t.type === filterType;
        return matchSearch && matchType;
    });

    // Urutkan dari yang terbaru
    filteredData.sort((a, b) => new Date(b.date) - new Date(a.date));

    if(filteredData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Tidak ada data transaksi.</td></tr>`;
        return;
    }

    filteredData.forEach(t => {
        const tr = document.createElement('tr');
        const isIncome = t.type === 'pemasukan';
        
        tr.innerHTML = `
            <td>${t.date}</td>
            <td>${t.description}</td>
            <td>${t.category}</td>
            <td>${t.person}</td>
            <td class="${isIncome ? 'text-income' : ''}">${isIncome ? formatRupiah(t.amount) : '-'}</td>
            <td class="${!isIncome ? 'text-expense' : ''}">${!isIncome ? formatRupiah(t.amount) : '-'}</td>
            <td class="action-btns">
                <button class="btn-secondary" onclick="editTransaction(${t.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-danger" onclick="deleteTransaction(${t.id})"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function updateSummary() {
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
        if(t.type === 'pemasukan') totalIncome += t.amount;
        else totalExpense += t.amount;
    });

    const balance = totalIncome - totalExpense;

    document.getElementById('total-income').innerText = formatRupiah(totalIncome);
    document.getElementById('total-expense').innerText = formatRupiah(totalExpense);
    document.getElementById('total-balance').innerText = formatRupiah(balance);
}

// Trigger untuk Fitur Search dan Filter
document.getElementById('search-input').addEventListener('input', renderTable);
document.getElementById('filter-type').addEventListener('change', renderTable);

function saveData() {
    localStorage.setItem('kas_transactions', JSON.stringify(transactions));
}

// ==========================================
// 5. CHART.JS (Grafik)
// ==========================================
function renderChart() {
    const ctx = document.getElementById('kasChart').getContext('2d');
    
    // Kalkulasi per kategori (opsional, tapi di sini kita buat ringkasan Pemasukan vs Pengeluaran)
    let totalIncome = transactions.filter(t => t.type === 'pemasukan').reduce((sum, t) => sum + t.amount, 0);
    let totalExpense = transactions.filter(t => t.type === 'pengeluaran').reduce((sum, t) => sum + t.amount, 0);

    if (kasChartInstance) {
        kasChartInstance.destroy(); // Hancurkan chart lama sebelum buat baru agar tidak tumpang tindih
    }

    kasChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pemasukan', 'Pengeluaran'],
            datasets: [{
                data: [totalIncome, totalExpense],
                backgroundColor: ['#1cc88a', '#e74a3b'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// ==========================================
// 6. FITUR TAMBAHAN (Dark Mode & Ekspor/Impor)
// ==========================================

// Toggle Dark Mode
document.getElementById('toggle-dark-mode').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('kas_darkMode', isDark);
});

// Export Excel menggunakan SheetJS
document.getElementById('btn-export-excel').addEventListener('click', () => {
    if(transactions.length === 0) return alert('Tidak ada data untuk diekspor!');
    
    const dataForExcel = transactions.map(t => ({
        "Tanggal": t.date,
        "Jenis": t.type.toUpperCase(),
        "Keterangan": t.description,
        "Kategori": t.category,
        "Nama / PIC": t.person,
        "Nominal (Rp)": t.amount
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Kas");
    XLSX.writeFile(workbook, `Laporan_Kas_${new Date().toISOString().split('T')[0]}.xlsx`);
});

// Export PDF menggunakan jsPDF + AutoTable
document.getElementById('btn-export-pdf').addEventListener('click', () => {
    if(transactions.length === 0) return alert('Tidak ada data untuk diekspor!');
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.text("Laporan Kas Keuangan Sekolah", 14, 15);
    
    const tableColumn = ["Tanggal", "Jenis", "Keterangan", "Kategori", "Nama", "Nominal"];
    const tableRows = [];

    transactions.forEach(t => {
        const rowData = [
            t.date, 
            t.type.toUpperCase(), 
            t.description, 
            t.category, 
            t.person, 
            formatRupiah(t.amount)
        ];
        tableRows.push(rowData);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        theme: 'striped'
    });

    doc.save(`Laporan_Kas_${new Date().toISOString().split('T')[0]}.pdf`);
});

// Backup Data (Download JSON)
document.getElementById('btn-backup-json').addEventListener('click', () => {
    const dataStr = JSON.stringify(transactions);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Kas_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

// Restore Data (Upload JSON)
document.getElementById('btn-restore-json').addEventListener('click', () => {
    document.getElementById('file-restore').click(); // Trigger input file tersembunyi
});

document.getElementById('file-restore').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const importedData = JSON.parse(event.target.result);
            if(Array.isArray(importedData)) {
                transactions = importedData;
                saveData();
                updateUI();
                alert('Data berhasil dipulihkan (Restore)!');
            } else {
                alert('Format file JSON tidak valid!');
            }
        } catch (error) {
            alert('Terjadi kesalahan saat membaca file JSON.');
        }
    };
    reader.readAsText(file);
});

// Reset Semua Data
document.getElementById('btn-reset-data').addEventListener('click', () => {
    if(confirm('PERINGATAN! Semua data transaksi akan dihapus permanen. Lanjutkan?')) {
        transactions = [];
        saveData();
        updateUI();
    }
});
