const router = require('express').Router();
const { body } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

const { handleError, throwValidationResult } = require('../utils');

const Author = require('../models/author');
const Book = require('../models/book');
const BookInstance = require('../models/bookinstance');
const Genre = require('../models/genre');


// Get checkbox and drop down option names
const loadOptions = handleError(async (req, res, next) => {
  const [authors, genres] = await Promise.all([Author.find().exec(), Genre.find().exec()]);

  Object.assign(res.locals, { authors, genres });

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

  throwValidationResult,
];

function loadFormErrors(err, req, res, next) {
  if (err.message === 'Validation failed') { // Not a good way to check the error
    Object.assign(res.locals, {
      book: req.body,
      errors: err.array(),
    });

    next();
  } else {
    next(err);
  }
}

// Mark selected genres as checked if that's the case
function loadCheckboxes(req, res, next) {
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
    loadOptions,

    (req, res) => {
      res.render('book_form', { title: 'Create Book' });
    },
  )
  .post(
    validateForm,

    // Save book if validation passed
    handleError(async (req, res, next) => {
      const book = new Book(req.body);
      res.redirect((await book.save()).url);
    }),

    loadFormErrors,

    loadOptions,

    loadCheckboxes,

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

      Object.assign(res.locals, { book });

      next();
    }),

    loadOptions,

    loadCheckboxes,

    (req, res) => {
      res.render('book_form', { title: 'Update Book' });
    },
  )
  .post(
    validateForm,

    handleError(async (req, res, next) => {
      const book = new Book(Object.assign(req.body, req.params));
      res.redirect((await Book.findByIdAndUpdate(req.params._id, book)).url);
    }),

    loadFormErrors,

    loadOptions,

    loadCheckboxes,

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

    res.render('book_detail', { title: 'Title', book, bookInstances });
  }));


module.exports = router;
