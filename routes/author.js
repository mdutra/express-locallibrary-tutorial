const router = require('express').Router();
const async = require('async');
const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

const Author = require('../models/author');
const Book = require('../models/book');


router.route('/create')
  .get((req, res, next) => {
    res.render('author_form', { title: 'Create Author' });
  })
  .post(
    // Validate fields
    body('first_name').isLength({ min: 1 }).trim().withMessage('First name must be specified.')
      .isAlphanumeric()
      .withMessage('First name has non-alphanumeric characters.'),
    body('family_name').isLength({ min: 1 }).trim().withMessage('Family name must be specified.')
      .isAlphanumeric()
      .withMessage('Family name has non-alphanumeric characters.'),
    body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601(),
    body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601(),

    // Sanitize fields
    sanitizeBody('first_name').trim().escape(),
    sanitizeBody('family_name').trim().escape(),
    sanitizeBody('date_of_birth').toDate(),
    sanitizeBody('date_of_death').toDate(),

    // Process request after validation and sanitization
    (req, res, next) => {
      // Extract the validation errors from a request
      const errors = validationResult(req);

      // Create an Author object with escaped and trimmed data.
      const author = new Author({
        first_name: req.body.first_name,
        family_name: req.body.family_name,
        date_of_birth: req.body.date_of_birth,
        date_of_death: req.body.date_of_death,
      });

      if (!errors.isEmpty()) {
        // There are errors. Render form again with sanitized values/errors messages.
        res.render('author_form', { title: 'Create Author', author, errors: errors.array() });
        return;
      }
      // Data from form is valid.
      author.save((err) => {
        if (err) {
          next(err);
        } else {
          // Successful - redirect to new author record.
          res.redirect(author.url);
        }
      });
    },
  );

router.route('/:id/delete')
  .get((req, res, next) => {
    async.parallel({
      author(callback) {
        Author.findById(req.params.id).exec(callback);
      },
      authors_books(callback) {
        Book.find({ author: req.params.id }).exec(callback);
      },
    }, (err, results) => {
      if (err) {
        next(err);
      } else if (results.author == null) { // No results.
        res.redirect('/catalog/authors');
      } else {
        // Successful, so render.
        res.render('author_delete', { title: 'Delete Author', author: results.author, author_books: results.authors_books });
      }
    });
  })
  .post((req, res, next) => {
    async.parallel({
      author(callback) {
        Author.findById(req.body.authorid).exec(callback);
      },
      authors_books(callback) {
        Book.find({ author: req.body.authorid }).exec(callback);
      },
    }, (err, results) => {
      if (err) {
        next(err);
      }
      // Success
      if (results.authors_books.length > 0) {
        // Author has books. Render in same way as for GET route.
        res.render('author_delete', { title: 'Delete Author', author: results.author, author_books: results.authors_books });
      } else {
        // Author has no books. Delete object and redirect to the list of authors.
        Author.findByIdAndRemove(req.body.authorid, (e) => {
          if (e) {
            next(e);
          } else {
            // Success - go to author list
            res.redirect('/catalog/authors');
          }
        });
      }
    });
  });

router.route('/:id/update')
  .get((req, res, next) => {
    Author.findById(req.params.id, (err, author) => {
      if (err) {
        next(err);
      } else if (author == null) { // No results.
        const e = new Error('Author not found');
        e.status = 404;
        next(e);
      } else {
        // Success
        res.render('author_form', { title: 'Update Author', author });
      }
    });
  })
  .post(
    // Validate fields
    body('first_name').isLength({ min: 1 }).trim().withMessage('First name must be specified.')
      .isAlphanumeric()
      .withMessage('First name has non-alphanumeric characters.'),
    body('family_name').isLength({ min: 1 }).trim().withMessage('Family name must be specified.')
      .isAlphanumeric()
      .withMessage('Family name has non-alphanumeric characters.'),
    body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601(),
    body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601(),

    // Sanitize fields
    sanitizeBody('first_name').trim().escape(),
    sanitizeBody('family_name').trim().escape(),
    sanitizeBody('date_of_birth').toDate(),
    sanitizeBody('date_of_death').toDate(),

    // Process request after validation and sanitization.
    (req, res, next) => {
      // Extract the validation errors from a request
      const errors = validationResult(req);

      // Create Author object with escaped and trimmed data (and the old id!)
      const author = new Author({
        first_name: req.body.first_name,
        family_name: req.body.family_name,
        date_of_birth: req.body.date_of_birth,
        date_of_death: req.body.date_of_death,
        _id: req.params.id,
      });

      if (!errors.isEmpty()) {
        // There are errors. Render the form again with sanitized values and error messages.
        res.render('author_form', { title: 'Update Author', author, errors: errors.array() });
        return;
      }
      // Data from form is valid. Update the record.
      Author.findByIdAndUpdate(req.params.id, author, {}, (err, theauthor) => {
        if (err) {
          next(err);
        } else {
          // Successful - redirect to genre detail page.
          res.redirect(theauthor.url);
        }
      });
    },
  );

// NOTE: This must go after route /create
router.route('/:id')
  .get((req, res, next) => {
    async.parallel({
      author(callback) {
        Author.findById(req.params.id)
          .exec(callback);
      },
      authors_books(callback) {
        Book.find({ author: req.params.id }, 'title summary')
          .exec(callback);
      },
    }, (err, results) => {
      // Error in API usage.
      if (err) {
        next(err);
      } else if (results.author == null) { // No results.
        const e = new Error('Author not found');
        e.status = 404;
        next(e);
      } else {
        // Successful, so render.
        res.render('author_detail', { title: 'Author Detail', author: results.author, author_books: results.authors_books });
      }
    });
  });


module.exports = router;
