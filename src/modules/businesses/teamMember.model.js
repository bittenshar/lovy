const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema(
  {
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['owner', 'admin', 'staff'],
      default: 'admin'
    },
    permissions: {
      type: [String],
      enum: ['full_access'],
      default: []
    },
    assignedLocations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business'
      }
    ],
    active: { type: Boolean, default: true },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    invitedAt: { type: Date, default: Date.now },
    joinedAt: { type: Date },
    lastActive: { type: Date }
  },
  { timestamps: true }
);

teamMemberSchema.index({ business: 1, email: 1 }, { unique: true });
teamMemberSchema.index({ business: 1, user: 1 }, { unique: true });

// Virtual for backwards compatibility
teamMemberSchema.virtual('businessId').get(function() {
  return this.business;
});

// Method to check if user has specific permission
teamMemberSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission);
};

// Method to check if user has any of the specified permissions
teamMemberSchema.methods.hasAnyPermission = function(permissions) {
  return permissions.some(permission => this.permissions.includes(permission));
};

// Method to check if user has all of the specified permissions
teamMemberSchema.methods.hasAllPermissions = function(permissions) {
  return permissions.every(permission => this.permissions.includes(permission));
};

module.exports = mongoose.model('TeamMember', teamMemberSchema);
