/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import db from './lib/db.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Helper for consistent responses
  const sendSuccess = (res: express.Response, data: any) => {
    return res.json({ success: true, data });
  };

  const sendError = (res: express.Response, error: string, statusCode = 500) => {
    console.error(`API Error: ${error}`);
    return res.status(statusCode).json({ success: false, error });
  };

  // ==========================
  // 1. SETTINGS API
  // ==========================
  app.get('/api/settings', (req, res) => {
    try {
      const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
      const settingsObj: Record<string, string> = {};
      rows.forEach(r => {
        settingsObj[r.key] = r.value;
      });
      return sendSuccess(res, settingsObj);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  app.put('/api/settings', (req, res) => {
    try {
      const settings = req.body; // Key-value map
      const updateStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      
      const transaction = db.transaction(() => {
        for (const [key, val] of Object.entries(settings)) {
          updateStmt.run(key, String(val));
        }
      });
      transaction();
      
      // Return fresh settings
      const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
      const settingsObj: Record<string, string> = {};
      rows.forEach(r => {
        settingsObj[r.key] = r.value;
      });
      return sendSuccess(res, settingsObj);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  // ==========================
  // 2. CATEGORIES API
  // ==========================
  app.get('/api/categories', (req, res) => {
    try {
      const rows = db.prepare(`
        SELECT c.*, COUNT(p.id) as product_count 
        FROM categories c 
        LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
        GROUP BY c.id
        ORDER BY c.name ASC
      `).all();
      return sendSuccess(res, rows);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  app.post('/api/categories', (req, res) => {
    try {
      const { name, color, icon } = req.body;
      if (!name) return sendError(res, 'Nama kategori wajib diisi', 400);

      const result = db.prepare(
        'INSERT INTO categories (name, color, icon) VALUES (?, ?, ?)'
      ).run(name, color || '#6366f1', icon || 'Package');

      const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
      return sendSuccess(res, newCategory);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  app.put('/api/categories/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { name, color, icon } = req.body;
      if (!name) return sendError(res, 'Nama kategori wajib diisi', 400);

      const result = db.prepare(
        'UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ?'
      ).run(name, color, icon, id);

      if (result.changes === 0) return sendError(res, 'Kategori tidak ditemukan', 404);

      const updatedCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
      return sendSuccess(res, updatedCategory);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  app.delete('/api/categories/:id', (req, res) => {
    try {
      const { id } = req.params;
      
      const transaction = db.transaction(() => {
        // Unbind any products in this deleted category
        db.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?').run(id);
        // Delete category
        db.prepare('DELETE FROM categories WHERE id = ?').run(id);
      });
      transaction();

      return sendSuccess(res, { message: 'Kategori berhasil dihapus' });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  // ==========================
  // 3. PRODUCTS API
  // ==========================
  app.get('/api/products', (req, res) => {
    try {
      const rows = db.prepare(`
        SELECT p.*, c.name as category_name
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        ORDER BY p.id DESC
      `).all();
      return sendSuccess(res, rows);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  app.get('/api/products/:id', (req, res) => {
    try {
      const { id } = req.params;
      const product = db.prepare(`
        SELECT p.*, c.name as category_name
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.id = ?
      `).get(id);
      
      if (!product) return sendError(res, 'Produk tidak ditemukan', 404);
      return sendSuccess(res, product);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  app.post('/api/products', (req, res) => {
    try {
      const { name, sku, barcode, category_id, price, cost_price, stock, min_stock, unit, image_url, description, is_active } = req.body;
      
      if (!name) return sendError(res, 'Nama produk wajib diisi', 400);
      if (price === undefined || price < 0) return sendError(res, 'Harga jual tidak valid', 400);

      // Generate SKU if not provided
      let finalSku = sku;
      if (!finalSku) {
        // Clean and make robust
        const cleanName = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
        const rand = Math.floor(100 + Math.random() * 900);
        finalSku = `SKU-${cleanName || 'PROD'}-${rand}`;
      }

      // Check unique SKU
      const existingSku = db.prepare('SELECT id FROM products WHERE sku = ?').get(finalSku);
      if (existingSku) {
        return sendError(res, `SKU ${finalSku} sudah digunakan oleh produk lain. Silakan gunakan SKU yang unik.`, 400);
      }

      const result = db.prepare(`
        INSERT INTO products (name, sku, barcode, category_id, price, cost_price, stock, min_stock, unit, image_url, description, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name,
        finalSku,
        barcode || '',
        category_id ? parseInt(category_id) : null,
        parseFloat(price),
        cost_price ? parseFloat(cost_price) : 0,
        stock ? parseInt(stock) : 0,
        min_stock !== undefined ? parseInt(min_stock) : 5,
        unit || 'pcs',
        image_url || '',
        description || '',
        is_active !== undefined ? (is_active ? 1 : 0) : 1
      );

      const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
      return sendSuccess(res, newProduct);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  app.put('/api/products/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { name, sku, barcode, category_id, price, cost_price, stock, min_stock, unit, image_url, description, is_active } = req.body;
      
      if (!name) return sendError(res, 'Nama produk wajib diisi', 400);
      if (price === undefined || price < 0) return sendError(res, 'Harga jual tidak valid', 400);
      if (!sku) return sendError(res, 'SKU produk wajib diisi', 400);

      // Check SKU unique except current
      const existingSku = db.prepare('SELECT id FROM products WHERE sku = ? AND id != ?').get(sku, id);
      if (existingSku) {
        return sendError(res, `SKU ${sku} sudah digunakan oleh produk lain`, 400);
      }

      const result = db.prepare(`
        UPDATE products 
        SET name = ?, sku = ?, barcode = ?, category_id = ?, price = ?, cost_price = ?, stock = ?, min_stock = ?, unit = ?, image_url = ?, description = ?, is_active = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        name,
        sku,
        barcode || '',
        category_id ? parseInt(category_id) : null,
        parseFloat(price),
        cost_price ? parseFloat(cost_price) : 0,
        stock ? parseInt(stock) : 0,
        min_stock !== undefined ? parseInt(min_stock) : 5,
        unit || 'pcs',
        image_url || '',
        description || '',
        is_active ? 1 : 0,
        id
      );

      if (result.changes === 0) return sendError(res, 'Produk tidak ditemukan', 404);

      const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      return sendSuccess(res, updatedProduct);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  app.delete('/api/products/:id', (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if product is referenced in transaction items
      const isReferenced = db.prepare('SELECT id FROM transaction_items WHERE product_id = ?').get(id);
      if (isReferenced) {
        // Soft delete instead by setting active to 0
        db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(id);
        return sendSuccess(res, { message: 'Produk disembunyikan/dinonaktifkan karena telah memiliki riwayat transaksi', softDeleted: true });
      }

      const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);
      if (result.changes === 0) return sendError(res, 'Produk tidak ditemukan', 404);

      return sendSuccess(res, { message: 'Produk berhasil dihapus' });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  // Bulk Product CSV Upload endpoint mock or direct handler
  app.post('/api/products/import', (req, res) => {
    try {
      const { products } = req.body; // should be list of objects
      if (!Array.isArray(products)) return sendError(res, 'Data import tidak valid', 400);

      const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO products (name, sku, barcode, price, cost_price, stock, min_stock, unit, description, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);

      let imported = 0;
      const transaction = db.transaction(() => {
        for (const p of products) {
          if (!p.name) continue;
          let finalSku = p.sku;
          if (!finalSku) {
            const cleanName = p.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
            const rand = Math.floor(100 + Math.random() * 900);
            finalSku = `SKU-${cleanName || 'IMP'}-${rand}`;
          }
          
          insertStmt.run(
            p.name,
            finalSku,
            p.barcode || '',
            parseFloat(p.price) || 0,
            parseFloat(p.cost_price) || 0,
            parseInt(p.stock) || 0,
            parseInt(p.min_stock) || 5,
            p.unit || 'pcs',
            p.description || ''
          );
          imported++;
        }
      });
      transaction();

      return sendSuccess(res, { imported, message: `${imported} produk berhasil diimport.` });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  // ==========================
  // 4. CUSTOMERS API
  // ==========================
  app.get('/api/customers', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM customers ORDER BY name ASC').all();
      return sendSuccess(res, rows);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  app.post('/api/customers', (req, res) => {
    try {
      const { name, phone, email, address } = req.body;
      if (!name) return sendError(res, 'Nama pelanggan wajib diisi', 400);

      const result = db.prepare(
        'INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)'
      ).run(name, phone || '', email || '', address || '');

      const newCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
      return sendSuccess(res, newCustomer);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  app.put('/api/customers/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, email, address } = req.body;
      if (!name) return sendError(res, 'Nama pelanggan wajib diisi', 400);

      const result = db.prepare(
        'UPDATE customers SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?'
      ).run(name, phone || '', email || '', address || '', id);

      if (result.changes === 0) return sendError(res, 'Pelanggan tidak ditemukan', 404);

      const updatedCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
      return sendSuccess(res, updatedCustomer);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  app.delete('/api/customers/:id', (req, res) => {
    try {
      const { id } = req.params;
      const transaction = db.transaction(() => {
        db.prepare('UPDATE transactions SET customer_id = NULL WHERE customer_id = ?').run(id);
        db.prepare('DELETE FROM customers WHERE id = ?').run(id);
      });
      transaction();
      return sendSuccess(res, { message: 'Pelanggan berhasil dihapus' });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  // ==========================
  // 5. USERS API
  // ==========================
  app.get('/api/users', (req, res) => {
    try {
      const rows = db.prepare('SELECT id, name, email, role, is_active, created_at FROM users ORDER BY name ASC').all();
      return sendSuccess(res, rows);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  app.post('/api/users', (req, res) => {
    try {
      const { name, email, password, role, is_active } = req.body;
      if (!name || !email || !password) return sendError(res, 'Nama, email, dan password wajib diisi', 400);

      // Check unique email
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingUser) return sendError(res, 'Email sudah terdaftar', 400);

      const result = db.prepare(
        'INSERT INTO users (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)'
      ).run(name, email, password, role || 'cashier', is_active !== undefined ? (is_active ? 1 : 0) : 1);

      const newUser = db.prepare('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
      return sendSuccess(res, newUser);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  app.put('/api/users/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, password, role, is_active } = req.body;
      if (!name || !email) return sendError(res, 'Nama dan email wajib diisi', 400);

      // Check email except current user
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, id);
      if (existingUser) return sendError(res, 'Email sudah terdaftar', 400);

      if (password) {
        db.prepare(
          'UPDATE users SET name = ?, email = ?, password = ?, role = ?, is_active = ? WHERE id = ?'
        ).run(name, email, password, role, is_active ? 1 : 0, id);
      } else {
        db.prepare(
          'UPDATE users SET name = ?, email = ?, role = ?, is_active = ? WHERE id = ?'
        ).run(name, email, role, is_active ? 1 : 0, id);
      }

      const updatedUser = db.prepare('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?').get(id);
      return sendSuccess(res, updatedUser);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  app.delete('/api/users/:id', (req, res) => {
    try {
      const { id } = req.params;
      
      // Keep at least 1 admin user
      const adminCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number }).count;
      const userToDelete = db.prepare('SELECT role FROM users WHERE id = ?').get(id) as { role: string } | undefined;
      
      if (userToDelete && userToDelete.role === 'admin' && adminCount <= 1) {
        return sendError(res, 'Tidak dapat menghapus admin terakhir pada sistem', 400);
      }

      const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
      if (result.changes === 0) return sendError(res, 'User tidak ditemukan', 404);

      return sendSuccess(res, { message: 'User berhasil dihapus' });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  // Login authentication simulation
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return sendError(res, 'Email dan password wajib diisi', 400);

      const user = db.prepare('SELECT id, name, email, role, is_active FROM users WHERE email = ? AND password = ?').get(email, password) as any;
      if (!user) {
        return sendError(res, 'Email atau password salah', 401);
      }
      if (!user.is_active) {
        return sendError(res, 'Akun Anda dinonaktifkan', 403);
      }
      return sendSuccess(res, user);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  // ==========================
  // 6. TRANSACTIONS API
  // ==========================
  app.get('/api/transactions', (req, res) => {
    try {
      const rows = db.prepare(`
        SELECT * FROM transactions 
        ORDER BY created_at DESC
      `).all();
      return sendSuccess(res, rows);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  app.get('/api/transactions/:id', (req, res) => {
    try {
      const { id } = req.params;
      const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
      if (!transaction) return sendError(res, 'Transaksi tidak ditemukan', 404);

      const items = db.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?').all(id);
      return sendSuccess(res, { ...(transaction as any), items });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  app.post('/api/transactions', (req, res) => {
    try {
      const {
        customer_id,
        customer_name,
        subtotal,
        discount,
        discount_type,
        tax,
        tax_rate,
        total,
        paid_amount,
        change_amount,
        payment_method,
        note,
        cashier_id,
        cashier_name,
        items // Array of { product_id, quantity, unit_price, discount, subtotal }
      } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return sendError(res, 'Item transaksi tidak boleh kosong', 400);
      }

      // Check actual stock bounds
      for (const item of items) {
        const prod = db.prepare('SELECT stock, name FROM products WHERE id = ?').get(item.product_id) as { stock: number, name: string } | undefined;
        if (!prod) {
          return sendError(res, `Produk dengan ID ${item.product_id} tidak ditemukan`, 404);
        }
        if (prod.stock < item.quantity) {
          // Warning: Let checkout run anyway, but update database safely OR throw
          // Let's protect and inform client if stock is insufficient
          // return sendError(res, `Stok produk "${prod.name}" kurang. Tersedia: ${prod.stock}`, 400);
        }
      }

      // SQLite transaction block
      let insertedTxId: number = 0;
      let invoiceNumber: string = '';

      const processTransaction = db.transaction(() => {
        // Generate Invoice Series per Day
        const todayStr = new Date().toISOString().split('T')[0];
        const dayPrefix = todayStr.replace(/-/g, '');
        const countRow = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE created_at LIKE ?").get(`${todayStr}%`) as { count: number };
        const seq = countRow.count + 1;
        const seqStr = String(seq).padStart(3, '0');
        invoiceNumber = `INV-${dayPrefix}-${seqStr}`;

        // Create transaction record
        const insertTx = db.prepare(`
          INSERT INTO transactions (
            invoice_number, customer_id, customer_name, subtotal, discount, discount_type, 
            tax, tax_rate, total, paid_amount, change_amount, payment_method, status, note, cashier_id, cashier_name, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, datetime('now'))
        `);

        const txRes = insertTx.run(
          invoiceNumber,
          customer_id ? parseInt(customer_id) : null,
          customer_name || 'Pelanggan Umum',
          parseFloat(subtotal),
          parseFloat(discount || 0),
          discount_type || 'nominal',
          parseFloat(tax || 0),
          parseFloat(tax_rate || 0),
          parseFloat(total),
          parseFloat(paid_amount),
          parseFloat(change_amount || 0),
          payment_method || 'cash',
          note || '',
          cashier_id ? parseInt(cashier_id) : 1,
          cashier_name || 'Kasir'
        );

        insertedTxId = txRes.lastInsertRowid as number;

        // Insert items & deduct stock
        const insertItem = db.prepare(`
          INSERT INTO transaction_items (
            transaction_id, product_id, product_name, product_sku, quantity, unit_price, discount, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const deductStock = db.prepare(`
          UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?
        `);

        for (const item of items) {
          // Get sku & name
          const prod = db.prepare('SELECT name, sku FROM products WHERE id = ?').get(item.product_id) as { name: string, sku: string };
          
          insertItem.run(
            insertedTxId,
            item.product_id,
            prod.name,
            prod.sku,
            parseInt(item.quantity),
            parseFloat(item.unit_price),
            parseFloat(item.discount || 0),
            parseFloat(item.subtotal)
          );

          deductStock.run(parseInt(item.quantity), item.product_id);
        }

        // Update customer statistics if set
        if (customer_id) {
          db.prepare(`
            UPDATE customers 
            SET total_transactions = total_transactions + 1, 
                total_spent = total_spent + ? 
            WHERE id = ?
          `).run(parseFloat(total), customer_id);
        }
      });

      processTransaction();

      // Retrieve invoice detail
      const fullTransaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(insertedTxId);
      const fullItems = db.prepare('SELECT * FROM transaction_items WHERE transaction_id = ?').all(insertedTxId);

      return sendSuccess(res, { ...(fullTransaction as any), items: fullItems });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  // Void a transaction
  app.put('/api/transactions/:id/void', (req, res) => {
    try {
      const { id } = req.params;
      const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as any;
      if (!tx) return sendError(res, 'Transaksi tidak ditemukan', 404);
      if (tx.status === 'voided') return sendError(res, 'Transaksi sudah dibatalkan sebelumnya', 400);

      const items = db.prepare('SELECT product_id, quantity FROM transaction_items WHERE transaction_id = ?').all(id) as { product_id: number; quantity: number }[];

      const voidTransaction = db.transaction(() => {
        // Set state to voided
        db.prepare("UPDATE transactions SET status = 'voided' WHERE id = ?").run(id);

        // Refund product stock
        const restoreStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
        for (const item of items) {
          restoreStock.run(item.quantity, item.product_id);
        }

        // Restate customer totals if exists
        if (tx.customer_id) {
          db.prepare(`
            UPDATE customers 
            SET total_transactions = MAX(0, total_transactions - 1), 
                total_spent = MAX(0, total_spent - ?) 
            WHERE id = ?
          `).run(tx.total, tx.customer_id);
        }
      });

      voidTransaction();
      return sendSuccess(res, { message: 'Transaksi berhasil dibatalkan (Voided)' });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  // ==========================
  // 7. REPORTS API
  // ==========================
  app.get('/api/reports/summary', (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterdayObj = new Date();
      yesterdayObj.setDate(yesterdayObj.getDate() - 1);
      const yesterday = yesterdayObj.toISOString().split('T')[0];

      // 1. Sales summary today
      const todaySales = db.prepare(`
        SELECT COUNT(id) as count, COALESCE(SUM(total), 0) as sales
        FROM transactions 
        WHERE status = 'completed' AND created_at LIKE ?
      `).get(`${today}%`) as { count: number; sales: number };

      // 2. Sales sum yesterday
      const yesterdaySales = db.prepare(`
        SELECT COUNT(id) as count, COALESCE(SUM(total), 0) as sales
        FROM transactions 
        WHERE status = 'completed' AND created_at LIKE ?
      `).get(`${yesterday}%`) as { count: number; sales: number };

      // 3. Today products sold COUNT
      const todayQty = db.prepare(`
        SELECT COALESCE(SUM(ti.quantity), 0) as qty 
        FROM transaction_items ti
        JOIN transactions t ON ti.transaction_id = t.id
        WHERE t.status = 'completed' AND t.created_at LIKE ?
      `).get(`${today}%`) as { qty: number };

      // 4. Low stock count
      const lowStock = db.prepare(`
        SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND stock <= min_stock
      `).get() as { count: number };

      // Calculate percentage comparisons vs yesterday
      const salesPercent = yesterdaySales.sales > 0 
        ? ((todaySales.sales - yesterdaySales.sales) / yesterdaySales.sales) * 100 
        : 0;
      
      const countPercent = yesterdaySales.count > 0 
        ? ((todaySales.count - yesterdaySales.count) / yesterdaySales.count) * 100 
        : 0;

      return sendSuccess(res, {
        todaySales: todaySales.sales,
        todayCount: todaySales.count,
        todayItemsSold: todayQty.qty,
        lowStockAlertCount: lowStock.count,
        salesComparisonPercent: Math.round(salesPercent),
        txComparisonPercent: Math.round(countPercent)
      });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  app.get('/api/reports/sales', (req, res) => {
    try {
      const { range } = req.query; // 'today', 'week', 'month', 'all'
      let dateFilter = '';
      
      const filterToday = new Date().toISOString().split('T')[0];

      let daysQuery = 7;
      if (range === 'month') daysQuery = 30;
      if (range === 'today') daysQuery = 1;

      // 1. Line chart sales over 7 or 30 days
      const lastXDaysSales = db.prepare(`
        SELECT date(created_at) as date, COALESCE(SUM(total), 0) as total, COUNT(id) as count
        FROM transactions 
        WHERE status = 'completed' AND created_at >= date('now', ?)
        GROUP BY date(created_at)
        ORDER BY date(created_at) ASC
      `).all(`-${daysQuery} days`) as { date: string; total: number; count: number }[];

      // 2. Hourly breakdown bar chart (today)
      // Group created_at hour from current date transactions
      const hourlySales = db.prepare(`
        SELECT strftime('%H', created_at) as hour, COALESCE(SUM(total), 0) as total 
        FROM transactions 
        WHERE status = 'completed' AND created_at LIKE ?
        GROUP BY hour
        ORDER BY hour ASC
      `).all(`${filterToday}%`) as { hour: string; total: number }[];

      // 3. Categories pie chart
      const categoryShare = db.prepare(`
        SELECT c.name as name, COALESCE(SUM(ti.subtotal), 0) as value, c.color as color
        FROM transaction_items ti
        JOIN products p ON ti.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        JOIN transactions t ON ti.transaction_id = t.id
        WHERE t.status = 'completed'
        GROUP BY c.id
      `).all();

      // 4. Top Selling Products (Top 10)
      const topProducts = db.prepare(`
        SELECT ti.product_id, ti.product_name as name, SUM(ti.quantity) as quantity, SUM(ti.subtotal) as revenue
        FROM transaction_items ti
        JOIN transactions t ON ti.transaction_id = t.id
        WHERE t.status = 'completed'
        GROUP BY ti.product_id
        ORDER BY quantity DESC
        LIMIT 10
      `).all();

      // 5. Gross dynamic profit report (Daily table: subtotal, taxes, discount, total, cost total, profit!)
      const dailyProfitReport = db.prepare(`
        SELECT 
          date(t.created_at) as date, 
          COUNT(t.id) as tx_count,
          SUM(t.subtotal) as subtotal, 
          SUM(t.discount) as discount, 
          SUM(t.tax) as tax, 
          SUM(t.total) as total,
          SUM((
            SELECT SUM(ti.quantity * p.cost_price)
            FROM transaction_items ti 
            JOIN products p ON ti.product_id = p.id 
            WHERE ti.transaction_id = t.id
          )) as total_cost
        FROM transactions t
        WHERE t.status = 'completed'
        GROUP BY date(t.created_at)
        ORDER BY date(t.created_at) DESC
      `).all() as any[];

      // Format clean report list
      const dynamicReport = dailyProfitReport.map((row: any) => {
        const costVal = row.total_cost || 0;
        const subAfterDiscStr = row.subtotal - row.discount;
        const estimatedProfit = subAfterDiscStr - costVal;
        
        return {
          date: row.date,
          txCount: row.tx_count,
          subtotal: row.subtotal,
          discount: row.discount,
          tax: row.tax,
          total: row.total,
          cost: costVal,
          profit: estimatedProfit
        };
      });

      // 6. Payments tally
      const paymentTallies = db.prepare(`
        SELECT payment_method as method, COALESCE(SUM(total), 0) as total, COUNT(id) as count
        FROM transactions 
        WHERE status = 'completed'
        GROUP BY payment_method
      `).all();

      return sendSuccess(res, {
        lastXDaysSales,
        hourlySales,
        categoryShare,
        topProducts,
        dailyProfitReport: dynamicReport,
        paymentTallies
      });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  // DB Reset/Erase endpoint
  app.post('/api/settings/reset-database', (req, res) => {
    try {
      const transaction = db.transaction(() => {
        db.prepare('DELETE FROM transaction_items').run();
        db.prepare('DELETE FROM transactions').run();
        db.prepare('UPDATE products SET stock = 100').run();
        db.prepare('UPDATE customers SET total_transactions = 0, total_spent = 0').run();
      });
      transaction();
      return sendSuccess(res, { message: 'Semua data transaksi berhasil direset' });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  });

  // ==========================
  // VITE DEV / PRODUCTION INGRESS
  // ==========================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets bundle
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express Full-Stack Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
