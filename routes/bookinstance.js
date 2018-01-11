const router = require('express').Router();
const { body } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

const { handleError, throwValidationResult } = require('../utils');

const Book = require('../models/book');
const BookInstance = require('../models/bookinstance');

function renderForm({ title }) {
  return handleError(async (req, res) => {
    res.render('bookinstance_form', {
      title,
      bookList: await Book.find({}, 'title').exec(),
    });
  });
}

const validateForm = [
  // Validate fields
  body('book', 'Book must be specified').isLength({ min: 1 }).trim(),
  body('imprint', 'Imprint must be specified').isLength({ min: 1 }).trim(),
  body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),

  // Sanitize fields
  sanitizeBody('book').trim().escape(),
  sanitizeBody('imprint').trim().escape(),
  sanitizeBody('status').trim().escape(),
  sanitizeBody('due_back').toDate(),

  throwValidationResult,
];

function loadFormErrors(err, req, res, next) {
  if (err.message === 'Validation failed') { // Not a good way to check the error
    Object.assign(res.locals, {
      bookinstance: req.body,
      selected_book: req.body.book._id,
      errors: err.array(),
    });

    next();
  } else {
    next(err);
  }
}

router.route('/create')
  .get(renderForm({ title: 'Create Book Instance' }))
  .post(
    validateForm,

    handleError(async (req, res, next) => {
      const bookinstance = new BookInstance(req.body);
      res.redirect((await bookinstance.save()).url);
    }),

    loadFormErrors,
    renderForm({ title: 'Create Book Instance' }),
  );

router.route('/:_id/update')
  .get(
    handleError(async (req, res, next) => {
      const bookinstance = await BookInstance.findById(req.params._id).populate('book').exec();

      if (res.locals.bookinstance === null) { // No results.
        const err = new Error('Book copy not found');
        err.status = 404;
        throw err;
      }

      Object.assign(res.locals, {
        bookinstance,
        selected_book: bookinstance.book._id,
      });

      next();
    }),

    renderForm({ title: 'Update Book Instance' }),
  )
  .post(
    validateForm,

    handleError(async (req, res, next) => {
      const bookinstance = new BookInstance(Object.assign(req.body, req.params));
      res.redirect((await BookInstance.findByIdAndUpdate(req.params._id, bookinstance)).url);
    }),

    loadFormErrors,
    renderForm({ title: 'Update Book Instance' }),
  );

router.route('/:id/delete')
  .get((req, res, next) => {
    BookInstance.findById(req.params.id)
      .populate('book')
      .exec((err, bookinstance) => {
        if (err) {
          next(err);
        } else if (bookinstance == null) { // No results.
          res.redirect('/bookinstances');
        } else {
          // Successful, so render.
          res.render('bookinstance_delete', { title: 'Delete BookInstance', bookinstance });
        }
      });
  })
  .post((req, res, next) => {
    // Assume valid BookInstance id in field.
    BookInstance.findByIdAndRemove(req.body.id, (err) => {
      if (err) {
        next(err);
      } else {
        // Success, so redirect to list of BookInstance items.
        res.redirect('/bookinstances');
      }
    });
  });

// NOTE: This must go after route /create
router.route('/:id')
  .get((req, res, next) => {
    BookInstance.findById(req.params.id)
      .populate('book')
      .exec((err, bookinstance) => {
        if (err) {
          next(err);
        } else if (bookinstance == null) { // No results.
          const e = new Error('Book copy not found');
          e.status = 404;
          next(e);
        } else {
          // Successful, so render.
          res.render('bookinstance_detail', { title: 'Book:', bookinstance });
        }
      });
  });


module.exports = router;
