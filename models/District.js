const mongoose = require('mongoose');

const districtSchema = new mongoose.Schema({
  districtName: { type: String, required: true },
  state: { type: String },

  population: { type: Number },
  areaSize: { type: Number },
  headquarters: { type: String },
  postalCode: { type: String },
  contactEmail: { type: String },
  websiteURL: { type: String },
  contactPhone: { type: String },
  description: { type: String },
  literacyRate: { type: Number },
  primaryLanguages: [{ type: String }],
  majorIndustries: [{ type: String }],
  infrastructure: { type: String },

  midcSezPresence: {
    presence: { type: Boolean, default: false },
    details: { type: String }
  },
  railConnectivity: {
    type: String,
    enum: ['Passenger', 'Freight', 'Both', 'None'],
    default: 'None'
  },
  airportAvailability: {
    available: { type: Boolean, default: false },
    details: { type: String }
  },
  powerSupply: { type: String },
  waterAvailability: { type: String },

  awardsPhotos: [{ type: String }]

}, {
  timestamps: true
});

module.exports = mongoose.model('District', districtSchema);
