/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'pos_database.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366f1',
    icon TEXT DEFAULT 'Package',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    barcode TEXT,
    category_id INTEGER,
    price REAL NOT NULL,
    cost_price REAL DEFAULT 0,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    unit TEXT DEFAULT 'pcs',
    image_url TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    total_transactions INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'cashier',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE NOT NULL,
    customer_id INTEGER,
    customer_name TEXT,
    subtotal REAL NOT NULL,
    discount REAL DEFAULT 0,
    discount_type TEXT DEFAULT 'nominal',
    tax REAL DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    total REAL NOT NULL,
    paid_amount REAL NOT NULL,
    change_amount REAL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    status TEXT DEFAULT 'completed',
    note TEXT,
    cashier_id INTEGER,
    cashier_name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS transaction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    product_sku TEXT,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    discount REAL DEFAULT 0,
    subtotal REAL NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Seed default settings if empty
const settingsCount = (db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number }).count;
if (settingsCount === 0) {
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  const defaultSettings = [
    ['store_name', 'Toko Berkah Utama'],
    ['store_address', 'Jl. Jenderal Sudirman No. 42, Jakarta'],
    ['store_phone', '081234567890'],
    ['tax_rate', '11'],
    ['currency', 'Rp'],
    ['receipt_footer', 'Terima kasih telah berbelanja di toko kami!'],
    ['low_stock_alert', '5']
  ];
  
  const transaction = db.transaction(() => {
    for (const [key, val] of defaultSettings) {
      insertSetting.run(key, val);
    }
  });
  transaction();
}

// Seed default categories if empty
const categoriesCount = (db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }).count;
if (categoriesCount === 0) {
  const insertCategory = db.prepare('INSERT INTO categories (name, color, icon) VALUES (?, ?, ?)');
  const defaultCategories = [
    ['Makanan', '#ef4444', 'Flame'],        // Red
    ['Minuman', '#3b82f6', 'CupSoda'],      // Blue
    ['Snack / Camilan', '#f59e0b', 'Cookie'], // Yellow
    ['Sembako', '#10b981', 'Package'],       // Green
    ['Kebutuhan Rumah', '#8b5cf6', 'Home']  // Purple
  ];

  const transaction = db.transaction(() => {
    for (const [name, color, icon] of defaultCategories) {
      insertCategory.run(name, color, icon);
    }
  });
  transaction();
}

// Seed default users if empty
const usersCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
if (usersCount === 0) {
  const insertUser = db.prepare('INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)');
  const transaction = db.transaction(() => {
    insertUser.run('Admin Utama', 'admin@toko.com', 'admin123', 'admin', 1);
    insertUser.run('Kasir Berbakat', 'kasir@toko.com', 'kasir123', 'cashier', 1);
  });
  transaction();
}

// Seed default customers if empty
const customersCount = (db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number }).count;
if (customersCount === 0) {
  const insertCustomer = db.prepare('INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)');
  const defaultCustomers = [
    ['Budi Santoso', '081122334455', 'budi@gmail.com', 'Keputih Gang 2 No. 10, Surabaya'],
    ['Siti Rahma', '085566778899', 'siti@yahoo.com', 'Mulyosari Utara No. 15, Surabaya'],
    ['Agus Wibowo', '089988776655', 'agus.w@outlook.com', 'Rungkut Harapan Blok B-5, Surabaya'],
    ['Dewi Lestari', '083321654987', 'dewi.lestari@gmail.com', 'Klampis Semalang No. 34, Surabaya']
  ];

  const transaction = db.transaction(() => {
    for (const [name, phone, email, addr] of defaultCustomers) {
      insertCustomer.run(name, phone, email, addr);
    }
  });
  transaction();
}

// Seed products if empty
const productsCount = (db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }).count;
if (productsCount === 0) {
  const categories = db.prepare('SELECT id, name FROM categories').all() as { id: number, name: string }[];
  const findCatId = (name: string): number => {
    const cat = categories.find(c => c.name.includes(name));
    return cat ? cat.id : categories[0].id;
  };

  const insertProduct = db.prepare(`
    INSERT INTO products (name, sku, barcode, category_id, price, cost_price, stock, min_stock, unit, description, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 20 realistic products
  const defaultProducts = [
    // Category Makanan
    ['Nasi Goreng Spesial', 'SKU-NASGOR-01', '899123412301', findCatId('Makanan'), 18000, 11000, 50, 5, 'porsi', 'Nasi goreng dengan telur, sosis, dan ayam suwir', ''],
    ['Mie Ayam Bakso', 'SKU-MIEAYM-02', '899123412302', findCatId('Makanan'), 15000, 9000, 40, 5, 'porsi', 'Mie ayam dengan topping ayam kecap dan 2 bakso sapi', ''],
    ['Ayam Goreng Penyet', 'SKU-AYMPNY-03', '899123412303', findCatId('Makanan'), 17000, 10500, 30, 5, 'porsi', 'Ayam goreng lengkap dengan sambal penyet kemangi dan lalapan', ''],
    ['Soto Ayam Lamongan', 'SKU-SOTOAM-04', '899123412304', findCatId('Makanan'), 14000, 8000, 25, 4, 'porsi', 'Soto ayam kuah kuning tabur koya gurih', ''],

    // Category Minuman
    ['Es Teh Manis', 'SKU-ESTEHM-01', '899123412305', findCatId('Minuman'), 4000, 1500, 200, 10, 'gelas', 'Es teh manis jumbo penyegar tenggorokan', ''],
    ['Kopi Susu Gula Aren', 'SKU-KOPSUS-02', '899123412306', findCatId('Minuman'), 10000, 4500, 80, 8, 'gelas', 'Kopi susu murni dengan gula aren alami khas nusantara', ''],
    ['Es Jeruk Peras', 'SKU-ESJRKP-03', '899123412307', findCatId('Minuman'), 6000, 2500, 100, 10, 'gelas', 'Es jeruk peras asli kaya vitamin C', ''],
    ['Air Mineral Botol 600ml', 'SKU-AQUABT-04', '899123412308', findCatId('Minuman'), 4000, 2000, 120, 15, 'botol', 'Air mineral pegunungan steril menyegarkan', ''],

    // Category Snack / Camilan
    ['Keripik Singkong Balado', 'SKU-KRPKSK-01', '899123412309', findCatId('Snack'), 8000, 4000, 60, 5, 'bungkus', 'Keripik singkong renyah dengan bumbu balado pedas manis', ''],
    ['Kue Banros Keju', 'SKU-KUEBRS-02', '899123412310', findCatId('Snack'), 12000, 7000, 35, 3, 'box', 'Kue tradisional banros isi 10 dengan parutan keju impor', ''],
    ['Roti Bakar Cokelat', 'SKU-ROTIBK-03', '899123412311', findCatId('Snack'), 14000, 8000, 40, 5, 'porsi', 'Roti bakar empuk isi cokelat lumer berlimpah', ''],
    ['Kentang Goreng Keju', 'SKU-FRENCH-04', '899123412312', findCatId('Snack'), 11000, 5500, 50, 5, 'porsi', 'Kentang goreng impor renyah tabur garam dan bumbu keju', ''],

    // Category Sembako
    ['Beras Premium 5kg', 'SKU-BERASP-01', '899123412313', findCatId('Sembako'), 68000, 58000, 25, 5, 'karung', 'Beras premium merk Anak Raja kualitas pulen alami', ''],
    ['Minyak Goreng 2L', 'SKU-MINYAK-02', '899123412314', findCatId('Sembako'), 34000, 29000, 30, 6, 'pouch', 'Minyak goreng kelapa sawit jernih kualitas ekspor', ''],
    ['Gula Pasir 1kg', 'SKU-GULAPS-03', '899123412315', findCatId('Sembako'), 16000, 13500, 45, 10, 'kg', 'Gula pasir tebu kristal putih murni', ''],
    ['Telur Ayam 1kg', 'SKU-TELURA-04', '', findCatId('Sembako'), 28000, 24000, 20, 5, 'kg', 'Telur ayam ras negeri segar berkualitas', ''],

    // Category Kebutuhan Rumah
    ['Sabun Cair Lifebuoy 450ml', 'SKU-SOAPLB-01', '899123412316', findCatId('Rumah'), 24000, 19500, 12, 3, 'pouch', 'Sabun mandi cair antiseptik perlindungan kuman', ''],
    ['Pasta Gigi Pepsodent 190g', 'SKU-PASTAP-02', '899123412317', findCatId('Rumah'), 15500, 12000, 22, 5, 'pcs', 'Pasta gigi perlindungan gigi berlubang maksimal', ''],
    ['Shampoo Sunsilk 160ml', 'SKU-SHAMPS-03', '899123412318', findCatId('Rumah'), 22000, 18000, 18, 4, 'botol', 'Sunsilk Black Shine untuk kilau rambut hitam alami', ''],
    ['Deterjen Rinso Molto 770g', 'SKU-RINSOM-04', '899123412319', findCatId('Rumah'), 29000, 24000, 15, 3, 'bag', 'Deterjen bubuk anti noda pakaian wangi semerbak', '']
  ];

  const transaction = db.transaction(() => {
    for (const item of defaultProducts) {
      insertProduct.run(item[0], item[1], item[2], item[3], item[4], item[5], item[6], item[7], item[8], item[9], item[10]);
    }
  });
  transaction();
}

// Seed dummy transactions and items if empty
const transactionsCount = (db.prepare('SELECT COUNT(*) as count FROM transactions').get() as { count: number }).count;
if (transactionsCount === 0) {
  const products = db.prepare('SELECT id, name, sku, price, cost_price, stock FROM products').all() as { id: number, name: string, sku: string, price: number, cost_price: number, stock: number }[];
  const customers = db.prepare('SELECT id, name FROM customers').all() as { id: number, name: string }[];

  const insertTx = db.prepare(`
    INSERT INTO transactions (invoice_number, customer_id, customer_name, subtotal, discount, discount_type, tax, tax_rate, total, paid_amount, change_amount, payment_method, status, note, cashier_id, cashier_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTxItem = db.prepare(`
    INSERT INTO transaction_items (transaction_id, product_id, product_name, product_sku, quantity, unit_price, discount, subtotal)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateCustStats = db.prepare(`
    UPDATE customers SET total_transactions = total_transactions + 1, total_spent = total_spent + ? WHERE id = ?
  `);

  // We will generate 10 transactions over the last selected dates
  const baseDate = new Date();
  const txData = [
    {
      invoice: 'INV-20260520-001',
      cust: customers[0],
      items: [
        { prod: products[0], qty: 2 }, // Nasi Goreng
        { prod: products[4], qty: 2 }  // Es Teh
      ],
      dlType: 'nominal' as const,
      dlVal: 0,
      pMethod: 'cash' as const,
      paid: 50000,
      daysAgo: 8
    },
    {
      invoice: 'INV-20260521-001',
      cust: customers[1],
      items: [
        { prod: products[1], qty: 1 }, // Mie Ayam
        { prod: products[6], qty: 1 }, // Es Jeruk
        { prod: products[8], qty: 1 }  // Keripik Singkong
      ],
      dlType: 'percent' as const,
      dlVal: 10, // 10% discount
      pMethod: 'qris' as const,
      paid: 26100,
      daysAgo: 7
    },
    {
      invoice: 'INV-20260522-001',
      cust: null,
      items: [
        { prod: products[2], qty: 2 }, // Ayam Goreng Penyet
        { prod: products[5], qty: 2 }  // Kopi Susu
      ],
      dlType: 'nominal' as const,
      dlVal: 2000,
      pMethod: 'cash' as const,
      paid: 60000,
      daysAgo: 6
    },
    {
      invoice: 'INV-20260523-001',
      cust: customers[2],
      items: [
        { prod: products[12], qty: 1 }, // Beras Premium 5kg
        { prod: products[13], qty: 1 }  // Minyak Goreng 2L
      ],
      dlType: 'nominal' as const,
      dlVal: 5000,
      pMethod: 'card' as const,
      paid: 97000,
      daysAgo: 5
    },
    {
      invoice: 'INV-20260524-001',
      cust: customers[3],
      items: [
        { prod: products[16], qty: 1 }, // Sabun cair
        { prod: products[17], qty: 2 }, // Pasta Gigi
        { prod: products[19], qty: 1 }  // Deterjen
      ],
      dlType: 'nominal' as const,
      dlVal: 0,
      pMethod: 'transfer' as const,
      paid: 84000,
      daysAgo: 4
    },
    // Transaction today or yesterday
    {
      invoice: 'INV-20260527-001',
      cust: customers[0],
      items: [
        { prod: products[10], qty: 2 }, // Roti Bakar
        { prod: products[5], qty: 2 }  // Kopi Susu
      ],
      dlType: 'nominal' as const,
      dlVal: 3000,
      pMethod: 'qris' as const,
      paid: 45000,
      daysAgo: 1
    },
    {
      invoice: 'INV-20260527-002',
      cust: null,
      items: [
        { prod: products[3], qty: 1 }, // Soto Ayam
        { prod: products[4], qty: 1 }  // Es Teh
      ],
      dlType: 'nominal' as const,
      dlVal: 0,
      pMethod: 'cash' as const,
      paid: 20000,
      daysAgo: 1
    },
    {
      invoice: 'INV-20260528-001', // Today
      cust: customers[2],
      items: [
        { prod: products[12], qty: 2 }, // Beras Premium 5kg
        { prod: products[14], qty: 3 }  // Gula
      ],
      dlType: 'nominal' as const,
      dlVal: 10000,
      pMethod: 'card' as const,
      paid: 174000,
      daysAgo: 0
    },
    {
      invoice: 'INV-20260528-002', // Today
      cust: customers[1],
      items: [
        { prod: products[0], qty: 3 }, // Nasi Goreng
        { prod: products[6], qty: 3 }  // Es Jeruk
      ],
      dlType: 'nominal' as const,
      dlVal: 5000,
      pMethod: 'qris' as const,
      paid: 67000,
      daysAgo: 0
    },
    {
      invoice: 'INV-20260528-003', // Today
      cust: null,
      items: [
        { prod: products[8], qty: 5 }, // Keripik Singkong
        { prod: products[4], qty: 4 }  // Es Teh
      ],
      dlType: 'percent' as const,
      dlVal: 5, // 5% off
      pMethod: 'cash' as const,
      paid: 60000,
      daysAgo: 0
    }
  ];

  const transaction = db.transaction(() => {
    for (const tx of txData) {
      // Calculate date string
      const date = new Date();
      date.setDate(baseDate.getDate() - tx.daysAgo);
      // Format to SQLite datetime: YYYY-MM-DD HH:MM:SS
      const hh = String(Math.floor(Math.random() * 8) + 9).padStart(2, '0'); // 09:00 to 17:00
      const mm = String(Math.floor(Math.random() * 59)).padStart(2, '0');
      const ss = String(Math.floor(Math.random() * 59)).padStart(2, '0');
      const dateString = `${date.toISOString().split('T')[0]} ${hh}:${mm}:${ss}`;

      // Calculate totals
      let subtotal = 0;
      for (const item of tx.items) {
        subtotal += item.prod.price * item.qty;
      }

      let discount = tx.dlVal;
      if (tx.dlType === 'percent') {
        discount = Math.round((subtotal * tx.dlVal) / 100);
      }

      const taxableAmount = subtotal - discount;
      const taxRate = 11; // 11% PPN
      const tax = Math.round((taxableAmount * taxRate) / 100);
      const total = taxableAmount + tax;
      const change = tx.pMethod === 'cash' ? Math.max(0, tx.paid - total) : 0;

      // Insert transaction
      const res = insertTx.run(
        tx.invoice,
        tx.cust ? tx.cust.id : null,
        tx.cust ? tx.cust.name : 'Pelanggan Umum',
        subtotal,
        discount,
        tx.dlType,
        tax,
        taxRate,
        total,
        tx.paid,
        change,
        tx.pMethod,
        'completed',
        'Pembelian sukses',
        1,
        'Admin Utama',
        dateString
      );

      const txInsertedId = res.lastInsertRowid as number;

      // Insert transaction items & subtract stock
      for (const item of tx.items) {
        const itemSubtotal = item.prod.price * item.qty;
        insertTxItem.run(
          txInsertedId,
          item.prod.id,
          item.prod.name,
          item.prod.sku,
          item.qty,
          item.prod.price,
          0, // item discount
          itemSubtotal
        );

        // Deduct stock
        db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(item.qty, item.prod.id);
      }

      // Update customer table totals
      if (tx.cust) {
        updateCustStats.run(total, tx.cust.id);
      }
    }
  });

  transaction();
}

export default db;
