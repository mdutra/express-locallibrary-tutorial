const router = require('express').Router();
const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

const { handleError } = require('../utils');

const Book = require('../models/book');
const BookInstance = require('../models/bookinstance');

const renderForm = handleError(async (req, res, next) => {
  res.render('bookinstance_form', {
    title: 'Create BookInstance',
    bookList: await Book.find({}, 'title').exec(),
  });
});

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
];

router.route('/create')
  .get(renderForm)
  .post(
    validateForm,

    handleError(async (req, res, next) => {
      const bookinstance = new BookInstance(req.body);
      const errors = validationResult(req);

      if (errors.isEmpty()) {
        res.redirect((await bookinstance.save()).url);
      } else {
        res.locals.bookinstance = bookinstance;
        res.locals.selected_book = bookinstance.book._id;
        res.locals.errors = errors.array();

        next();
      }
    }),

    renderForm,
  );

router.route('/:_id/update')
  .get(handleError(async (req, res, next) => {
    const [bookinstance, bookList] = await Promise.all([
      BookInstance.findById(req.params._id).populate('book').exec(),
      Book.find({}, 'title').exec(),
    ]);

    if (bookinstance === null) { // No results.
      const e = new Error('Book copy not found');
      e.status = 404;
      next(e);
    } else {
      res.render('bookinstance_form', {
        title: 'Update BookInstance', bookList: bookList, bookinstance, selected_book: bookinstance.book._id,
      });
    }
  }))
  .post(
    validateForm,

    // Process request after validation and sanitization
    handleError(async (req, res, next) => {
      const bookinstance = new BookInstance(Object.assign(req.body, req.params));
      const errors = validationResult(req);

      if (errors.isEmpty()) {
        res.redirect((await BookInstance.findByIdAndUpdate(req.params._id, bookinstance)).url);
      } else {
        res.render('bookinstance_form', {
          title: 'Update BookInstance',
          bookList: await Book.find({}, 'title').exec(),
          bookinstance,
          selected_book: bookinstance.book._id,
          errors: errors.array(),
        });
      }
    }),
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
