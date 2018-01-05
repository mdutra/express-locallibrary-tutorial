const mongoose = require('mongoose');
const moment = require('moment'); // for date handling


const { Schema } = mongoose;

const AuthorSchema = new Schema({
  first_name: { type: String, required: true, max: 100 },
  family_name: { type: String, required: true, max: 100 },
  date_of_birth: { type: Date },
  date_of_death: { type: Date },
});

// Virtual for author "full" name
AuthorSchema
  .virtual('name')
  .get(function getName() {
    return `${this.family_name}, ${this.first_name}`;
  });

// Virtual for this author instance URL
AuthorSchema
  .virtual('url')
  .get(function getURL() {
    return `/catalog/author/${this._id}`;
  });

AuthorSchema
  .virtual('lifespan')
  .get(function getLifespan() {
    let lifetimeString = '';
    if (this.date_of_birth) {
      lifetimeString = moment(this.date_of_birth).format('MMMM Do, YYYY');
    }
    lifetimeString += ' - ';
    if (this.date_of_death) {
      lifetimeString += moment(this.date_of_death).format('MMMM Do, YYYY');
    }
    return lifetimeString;
  });

AuthorSchema
  .virtual('date_of_birth_yyyy_mm_dd')
  .get(function getDateOfBirth() {
    return moment(this.date_of_birth).format('YYYY-MM-DD');
  });

AuthorSchema
  .virtual('date_of_death_yyyy_mm_dd')
  .get(function getDateOfDeath() {
    return moment(this.date_of_death).format('YYYY-MM-DD');
  });

// Export model
module.exports = mongoose.model('Author', AuthorSchema);
