const { Schema, model, models } = require('mongoose');

const PurchaseRequestMessageSchema = new Schema({
  purchaseRequest: { type: Schema.Types.ObjectId, ref: 'PurchaseRequest', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  is_read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = models.PurchaseRequestMessage || model('PurchaseRequestMessage', PurchaseRequestMessageSchema); 