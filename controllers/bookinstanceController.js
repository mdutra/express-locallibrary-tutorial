const BookInstance = require('../models/bookinstance');
const Book = require('../models/book');
const async = require('async');

const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// Display list of all BookInstances
exports.bookinstance_list = function (req, res, next) {
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
};

// Display detail page for a specific BookInstance
exports.bookinstance_detail = function (req, res, next) {
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
};

// Display BookInstance create form on GET
exports.bookinstance_create_get = function (req, res, next) {
  Book.find({}, 'title')
    .exec((err, books) => {
      if (err) {
        next(err);
      } else {
        // Successful, so render.
        res.render('bookinstance_form', { title: 'Create BookInstance', book_list: books });
      }
    });
};

// Handle BookInstance create on POST
exports.bookinstance_create_post = [

  // Validate fields
  body('book', 'Book must be specified').isLength({ min: 1 }).trim(),
  body('imprint', 'Imprint must be specified').isLength({ min: 1 }).trim(),
  body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),

  // Sanitize fields
  sanitizeBody('book').trim().escape(),
  sanitizeBody('imprint').trim().escape(),
  sanitizeBody('status').trim().escape(),
  sanitizeBody('due_back').toDate(),

  // Process request after validation and sanitization
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data.
    const bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values and error messages.
      Book.find({}, 'title')
        .exec((err, books) => {
          if (err) {
            next(err);
          } else {
            // Successful, so render.
            res.render('bookinstance_form', {
              title: 'Create BookInstance', book_list: books, selected_book: bookinstance.book._id, errors: errors.array(), bookinstance,
            });
          }
        });
    } else {
      // Data from form is valid
      bookinstance.save((err) => {
        if (err) {
          next(err);
        } else {
          // Successful - redirect to new record.
          res.redirect(bookinstance.url);
        }
      });
    }
  },
];


// Display BookInstance delete form on GET
exports.bookinstance_delete_get = function (req, res, next) {
  BookInstance.findById(req.params.id)
    .populate('book')
    .exec((err, bookinstance) => {
      if (err) {
        next(err);
      } else if (bookinstance == null) { // No results.
        res.redirect('/catalog/bookinstances');
      } else {
        // Successful, so render.
        res.render('bookinstance_delete', { title: 'Delete BookInstance', bookinstance });
      }
    });
};

// Handle BookInstance delete on POST
exports.bookinstance_delete_post = function (req, res, next) {
  // Assume valid BookInstance id in field.
  BookInstance.findByIdAndRemove(req.body.id, (err) => {
    if (err) {
      next(err);
    } else {
      // Success, so redirect to list of BookInstance items.
      res.redirect('/catalog/bookinstances');
    }
  });
};

// Display BookInstance update form on GET
exports.bookinstance_update_get = function (req, res, next) {
  // Get book, authors and genres for form.
  async.parallel({
    bookinstance(callback) {
      BookInstance.findById(req.params.id).populate('book').exec(callback);
    },
    books(callback) {
      Book.find(callback);
    },

  }, (err, results) => {
    if (err) {
      next(err);
    } else if (results.bookinstance == null) { // No results.
      const e = new Error('Book copy not found');
      e.status = 404;
      next(e);
    } else {
      // Success.
      res.render('bookinstance_form', {
        title: 'Update  BookInstance', book_list: results.books, selected_book: results.bookinstance.book._id, bookinstance: results.bookinstance,
      });
    }
  });
};

// Handle BookInstance update on POST
exports.bookinstance_update_post = [

  // Validate fields
  body('book', 'Book must be specified').isLength({ min: 1 }).trim(),
  body('imprint', 'Imprint must be specified').isLength({ min: 1 }).trim(),
  body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),

  // Sanitize fields
  sanitizeBody('book').trim().escape(),
  sanitizeBody('imprint').trim().escape(),
  sanitizeBody('status').trim().escape(),
  sanitizeBody('due_back').toDate(),

  // Process request after validation and sanitization
  (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    // Create a BookInstance object with escaped/trimmed data and current id.
    const bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
      _id: req.params.id,
    });

    if (!errors.isEmpty()) {
      // There are errors so render the form again, passing sanitized values and errors
      Book.find({}, 'title')
        .exec((err, books) => {
          if (err) {
            next(err);
          } else {
            // Successful, so render.
            res.render('bookinstance_form', {
              title: 'Update BookInstance', book_list: books, selected_book: bookinstance.book._id, errors: errors.array(), bookinstance,
            });
          }
        });
      return;
    }
    // Data from form is valid.
    BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {}, (err, thebookinstance) => {
      if (err) {
        next(err);
      } else {
        // Successful - redirect to detail page.
        res.redirect(thebookinstance.url);
      }
    });
  },
];
