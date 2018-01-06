const router = require('express').Router();
const async = require('async');
const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

const Genre = require('../models/genre');
const Book = require('../models/book');

router.route('/create')
  .get((req, res, next) => {
    res.render('genre_form', { title: 'Create Genre' });
  })
  .post(
    // Validate that the name field is not empty.
    body('name', 'Genre name required').isLength({ min: 1 }).trim(),

    // Sanitize (trim and escape) the name field.
    sanitizeBody('name').trim().escape(),

    // Process request after validation and sanitization.
    (req, res, next) => {
      // Extract the validation errors from a request.
      const errors = validationResult(req);

      // Create a genre object with escaped and trimmed data.
      const genre = new Genre({ name: req.body.name });


      if (!errors.isEmpty()) {
        // There are errors. Render the form again with sanitized values/error messages.
        res.render('genre_form', { title: 'Create Genre', genre, errors: errors.array() });
        return;
      }
      // Data from form is valid.
      // Check if Genre with same name already exists.
      Genre.findOne({ name: req.body.name })
        .exec((err, foundGenre) => {
          if (err) {
            next(err);
          } else if (foundGenre) {
            // Genre exists, redirect to its detail page
            res.redirect(foundGenre.url);
          } else {
            genre.save((e) => {
              if (e) {
                next(e);
              } else {
                // Genre saved. Redirect to genre detail page
                res.redirect(genre.url);
              }
            });
          }
        });
    },
  );

router.route('/:id/delete')
  .get((req, res, next) => {
    async.parallel({
      genre(callback) {
        Genre.findById(req.params.id).exec(callback);
      },
      genre_books(callback) {
        Book.find({ genre: req.params.id }).exec(callback);
      },
    }, (err, results) => {
      if (err) {
        next(err);
      } else if (results.genre == null) { // No results.
        res.redirect('/catalog/genres');
      } else {
        // Successful, so render.
        res.render('genre_delete', { title: 'Delete Genre', genre: results.genre, genre_books: results.genre_books });
      }
    });
  })
  .post((req, res, next) => {
    async.parallel({
      genre(callback) {
        Genre.findById(req.params.id).exec(callback);
      },
      genre_books(callback) {
        Book.find({ genre: req.params.id }).exec(callback);
      },
    }, (err, results) => {
      if (err) {
        next(err);
      } else if (results.genre_books.length > 0) {
        // Genre has books. Render in same way as for GET route.
        res.render('genre_delete', { title: 'Delete Genre', genre: results.genre, genre_books: results.genre_books });
      } else {
        // Genre has no books. Delete object and redirect to the list of genres.
        Genre.findByIdAndRemove(req.body.id, (e) => {
          if (e) {
            next(e);
          } else {
            // Success - go to genres list.
            res.redirect('/catalog/genres');
          }
        });
      }
    });
  });

router.route('/:id/update')
  .get((req, res, next) => {
    Genre.findById(req.params.id, (err, genre) => {
      if (err) {
        next(err);
      } else if (genre == null) { // No results.
        const e = new Error('Genre not found');
        e.status = 404;
        next(e);
      } else {
        // Success
        res.render('genre_form', { title: 'Update Genre', genre });
      }
    });
  })
  .post(
    // Validate that the name field is not empty.
    body('name', 'Genre name required').isLength({ min: 1 }).trim(),

    // Sanitize (trim and escape) the name field.
    sanitizeBody('name').trim().escape(),

    // Process request after validation and sanitization.
    (req, res, next) => {
      // Extract the validation errors from a request
      const errors = validationResult(req);

      // Create a genre object with escaped and trimmed data (and the old id!)
      const genre = new Genre({
        name: req.body.name,
        _id: req.params.id,
      });


      if (!errors.isEmpty()) {
        // There are errors. Render the form again with sanitized values and error messages.
        res.render('genre_form', { title: 'Update Genre', genre, errors: errors.array() });
      } else {
        // Data from form is valid. Update the record.
        Genre.findByIdAndUpdate(req.params.id, genre, {}, (err, theGenre) => {
          if (err) {
            next(err);
          } else {
            // Successful - redirect to genre detail page.
            res.redirect(theGenre.url);
          }
        });
      }
    },
  );

// NOTE: This must go after route /create
router.route('/:id')
  .get((req, res, next) => {
    async.parallel({
      genre(callback) {
        Genre.findById(req.params.id)
          .exec(callback);
      },

      genre_books(callback) {
        Book.find({ genre: req.params.id })
          .exec(callback);
      },

    }, (err, results) => {
      if (err) {
        next(err);
      } else if (results.genre == null) { // No results.
        const e = new Error('Genre not found');
        e.status = 404;
        next(e);
      } else {
        // Successful, so render.
        res.render('genre_detail', { title: 'Genre Detail', genre: results.genre, genre_books: results.genre_books });
      }
    });
  });


module.exports = router;
