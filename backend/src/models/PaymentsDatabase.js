const JsonStore = require('../utils/JsonStore');

class PaymentsDatabase {
  constructor() {
    this.store = new JsonStore('payments.json', []);
    this.payments = this.store.getAll();
    this.nextId =
      this.payments && this.payments.length > 0
        ? Math.max(...this.payments.map((p) => p.id || 0)) + 1
        : 1;
  }

  save() {
    this.store.setAll(this.payments);
  }

  create({ user_id, plan, amount_cents, currency = 'COP', gym_id = null, trainer_id = null }) {
    const payment = {
      id: this.nextId++,
      user_id,
      plan,
      amount_cents,
      currency,
      status: 'pendiente',
      gym_id,
      trainer_id,
      createdAt: new Date(),
      paidAt: null,
    };
    this.payments.push(payment);
    this.save();
    return payment;
  }

  getById(id) {
    return this.payments.find(p => p.id === id);
  }

  updateStatus(id, status) {
    const p = this.getById(id);
    if (!p) return null;
    p.status = status;
    if (status === 'pagado') p.paidAt = new Date();
    this.save();
    return p;
  }

  getByUserId(user_id) {
    return this.payments.filter(p => p.user_id === user_id);
  }
}

module.exports = new PaymentsDatabase();
