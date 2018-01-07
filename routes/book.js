const router = require('express').Router();
const async = require('async');
const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

const { handleError } = require('../utils');

const Author = require('../models/author');
const Book = require('../models/book');
const BookInstance = require('../models/bookinstance');
const Genre = require('../models/genre');


// Get checkbox and drop down option names
const listOptions = handleError(async (req, res, next) => {
  const [authors, genres] = await Promise.all([Author.find().exec(), Genre.find().exec()]);

  res.locals.authors = authors;
  res.locals.genres = genres;

  next();
});

const validateForm = [
  // Convert the genre to an array
  (req, res, next) => {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre === 'undefined') {
        req.body.genre = [];
      } else {
        req.body.genre = new Array(req.body.genre);
      }
    }
    next();
  },

  // Validate fields
  body('title', 'Title must not be empty.').isLength({ min: 1 }).trim(),
  body('author', 'Author must not be empty.').isLength({ min: 1 }).trim(),
  body('summary', 'Summary must not be empty.').isLength({ min: 1 }).trim(),
  body('isbn', 'ISBN must not be empty').isLength({ min: 1 }).trim(),

  // Sanitize fields
  sanitizeBody('*').trim().escape(),
  sanitizeBody('genre.*').trim().escape(),
];

// Mark selected genres as checked if that's the case
function markCheckboxes(req, res, next) {
  const selected = res.locals.book.genre;
  const { genres } = res.locals;

  for (let i = 0; i < genres.length; i += 1) {
    if (selected.indexOf(genres[i]._id) > -1) {
      genres[i].checked = 'true';
    }
  }

  next();
}

router.route('/create')
  .get(
    listOptions,

    (req, res) => {
      res.render('book_form', { title: 'Create Book' });
    },
  )
  .post(
    validateForm,

    handleError(async (req, res, next) => {
      const book = new Book(req.body);
      const err = validationResult(req);

      if (err.isEmpty()) {
        res.redirect((await book.save()).url);
      } else {
        // Render the page again
        res.locals.book = book;
        res.locals.errors = err.array();

        next();
      }
    }),

    listOptions,

    markCheckboxes,

    (req, res, next) => {
      res.render('book_form', { title: 'Create Book' });
    },
  );

router.route('/:_id/update')
  .get(
    handleError(async (req, res, next) => {
      const book = await Book.findById(req.params._id).exec();

      if (book === null) {
        const err = new Error('Book not found');
        err.status = 404;
        throw err;
      }

      res.locals.book = book;

      next();
    }),

    listOptions,

    markCheckboxes,

    (req, res) => {
      res.render('book_form', { title: 'Update Book' });
    },
  )
  .post(
    validateForm,

    handleError(async (req, res, next) => {
      const book = new Book(Object.assign(req.body, req.params));
      const err = validationResult(req);

      if (err.isEmpty()) {
        res.redirect((await Book.findByIdAndUpdate(req.params._id, book)).url);
      } else {
        // Render the page again
        res.locals.book = book;
        res.locals.errors = err.mapped();
        res.locals.title = 'Update Book';

        next();
      }
    }),

    listOptions,

    markCheckboxes,

    (req, res, next) => {
      res.render('book_form', { title: 'Update Book' });
    },
  );

router.route('/:id/delete')
  .get(handleError(async (req, res, next) => {
    const [book, bookInstances] = await Promise.all([
      Book.findById(req.params.id).populate('author').populate('genre').exec(),
      BookInstance.find({ book: req.params.id }).exec(),
    ]);

    if (book === null) {
      const err = new Error('Book not found');
      err.status = 404;
      throw err;
    }

    res.render('book_delete', { title: 'Delete Book', book, bookInstances });
  }))
  .post(handleError(async (req, res, next) => {
    const [book, bookInstances] = await Promise.all([
      Book.findById(req.params.id).populate('author').populate('genre').exec(),
      BookInstance.find({ book: req.body.id }).exec(),
    ]);

    if (bookInstances.length) {
      res.render('book_delete', { title: 'Delete Book', book, bookInstances });
    } else {
      await Book.findByIdAndRemove(req.body.id);
      res.redirect('/books');
    }
  }));

// NOTE: This must go after /create
router.route('/:id')
  .get((req, res, next) => {
    async.parallel({
      book(callback) {
        Book.findById(req.params.id)
          .populate('author')
          .populate('genre')
          .exec(callback);
      },
      book_instance(callback) {
        BookInstance.find({ book: req.params.id })
          .exec(callback);
      },
    }, (err, results) => {
      if (err) {
        next(err);
      } else if (results.book == null) { // No results.
        const e = new Error('Book not found');
        e.status = 404;
        next(e);
      } else {
        // Successful, so render.
        res.render('book_detail', { title: 'Title', book: results.book, book_instances: results.book_instance });
      }
    });
  });


module.exports = router;
