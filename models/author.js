const mongoose = require('mongoose');
const { DateTime } = require('luxon');

const { Schema } = mongoose;

const AuthorSchema = new Schema({
  first_name: { type: String, required: true, maxLength: 100 },
  family_name: { type: String, required: true, maxLength: 100 },
  date_of_birth: { type: Date },
  date_of_death: { type: Date },
});

// Virtual for author's full name
AuthorSchema.virtual('name').get(function () {
  return `${this.family_name}, ${this.first_name}`;
});

// Virtual for author's lifespan
AuthorSchema.virtual('lifespan').get(function () {
  let lifetimeString = '';
  if (this.date_of_birth) {
    lifetimeString = DateTime.fromJSDate(this.date_of_birth).toLocaleString(
      DateTime.DATE_MED
    );
  }
  lifetimeString += ' - ';
  if (this.date_of_death) {
    lifetimeString += DateTime.fromJSDate(this.date_of_death).toLocaleString(
      DateTime.DATE_MED
    );
  }
  return lifetimeString;
});

// Virtual for display in 'view' due date formatted
AuthorSchema.virtual('date_of_birth_JSDate').get(function () {
  return DateTime.fromJSDate(this.date_of_birth).toFormat('yyyy-MM-dd');
});

// Virtual for display in 'view' due date formatted
AuthorSchema.virtual('date_of_death_JSDate').get(function () {
  return DateTime.fromJSDate(this.date_of_death).toFormat('yyyy-MM-dd');
});

// Virtual for author's URL
AuthorSchema.virtual('url').get(function () {
  return `/catalog/author/${this._id}`;
});

// Export model
module.exports = mongoose.model('Author', AuthorSchema);
