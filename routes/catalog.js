const router = require('express').Router();

const { handleError } = require('../utils');

const Book = require('../models/book');
const Author = require('../models/author');
const Genre = require('../models/genre');
const BookInstance = require('../models/bookinstance');


router.get('/', handleError(async (req, res) => {
  res.render('index', {
    title: 'Local Library Home',
    // The next two properties should be used together
    names: ['Books', 'Copies', 'Copies available', 'Authors', 'Genres'],
    counts: await Promise.all([
      Book.count().exec(),
      BookInstance.count().exec(),
      BookInstance.count({ status: 'Available' }).exec(),
      Author.count().exec(),
      Genre.count().exec(),
    ]),
  });
}));

router.get('/books', (req, res, next) => {
  Book.find({}, 'title author ')
    .populate('author')
    .exec((err, listBooks) => {
      if (err) {
        next(err);
      } else {
        // Successful, so render
        res.render('book_list', { title: 'Book List', book_list: listBooks });
      }
    });
});

router.get('/authors', (req, res, next) => {
  Author.find()
    .sort([['family_name', 'ascending']])
    .exec((err, listAuthors) => {
      if (err) {
        next(err);
      } else {
      // Successful, so render
        res.render('author_list', { title: 'Author List', author_list: listAuthors });
      }
    });
});

router.get('/genres', (req, res, next) => {
  Genre.find()
    .sort([['name', 'ascending']])
    .exec((err, listGenres) => {
      if (err) {
        next(err);
      } else {
        // Successful, so render.
        res.render('genre_list', { title: 'Genre List', listGenres });
      }
    });
});

router.get('/bookinstances', (req, res, next) => {
  BookInstance.find()
    .populate('book')
    .exec((err, listBookinstances) => {
      if (err) {
        next(err);
      } else {
        // Successful, so render.
        res.render('bookinstance_list', { title: 'Book Instance List', bookinstance_list: listBookinstances });
      }
    });
});


module.exports = router;
