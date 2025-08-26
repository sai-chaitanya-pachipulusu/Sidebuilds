const { Schema, model, models } = require('mongoose');

const PurchaseRequestSchema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected', 'completed'], 
    default: 'pending' 
  },
  message: { type: String },
  price: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = models.PurchaseRequest || model('PurchaseRequest', PurchaseRequestSchema); 