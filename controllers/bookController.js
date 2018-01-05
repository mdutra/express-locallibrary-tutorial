const async = require('async');
const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

const Book = require('../models/book');
const Author = require('../models/author');
const Genre = require('../models/genre');
const BookInstance = require('../models/bookinstance');


module.exports = {
  index(req, res) {
    async.parallel({
      book_count(callback) {
        Book.count(callback);
      },
      book_instance_count(callback) {
        BookInstance.count(callback);
      },
      book_instance_available_count(callback) {
        BookInstance.count({ status: 'Available' }, callback);
      },
      author_count(callback) {
        Author.count(callback);
      },
      genre_count(callback) {
        Genre.count(callback);
      },
    }, (err, results) => {
      res.render('index', { title: 'Local Library Home', error: err, data: results });
    });
  },

  // Display list of all books
  book_list(req, res, next) {
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
  },

  // Display detail page for a specific book
  book_detail(req, res, next) {
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
  },

  // Display book create form on GET
  book_create_get(req, res, next) {
    // Get all authors and genres, which we can use for adding to our book.
    async.parallel({
      authors(callback) {
        Author.find(callback);
      },
      genres(callback) {
        Genre.find(callback);
      },
    }, (err, results) => {
      if (err) {
        next(err);
      } else {
        res.render('book_form', { title: 'Create Book', authors: results.authors, genres: results.genres });
      }
    });
  },

  // Handle book create on POST
  book_create_post: [
    // Convert the genre to an array
    (req, res, next) => {
      if (!(req.body.genre instanceof Array)) {
        if (typeof req.body.genre === 'undefined') { req.body.genre = []; } else { req.body.genre = new Array(req.body.genre); }
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
    // Process request after validation and sanitization
    (req, res, next) => {
      // Extract the validation errors from a request
      const errors = validationResult(req);

      // Create a Book object with escaped and trimmed data.
      const book = new Book({
        title: req.body.title,
        author: req.body.author,
        summary: req.body.summary,
        isbn: req.body.isbn,
        genre: req.body.genre,
      });

      if (!errors.isEmpty()) {
        // There are errors. Render form again with sanitized values/error messages.

        // Get all authors and genres for form
        async.parallel({
          authors(callback) {
            Author.find(callback);
          },
          genres(callback) {
            Genre.find(callback);
          },
        }, (err, results) => {
          if (err) {
            next(err);
          } else {
            // Mark our selected genres as checked
            for (let i = 0; i < results.genres.length; i += 1) {
              if (book.genre.indexOf(results.genres[i]._id) > -1) {
                results.genres[i].checked = 'true';
              }
            }

            res.render('book_form', {
              title: 'Create Book', authors: results.authors, genres: results.genres, book, errors: errors.array(),
            });
          }
        });
        return;
      }
      // Data from form is valid. Save book.
      book.save((err) => {
        if (err) {
          next(err);
        } else {
          // successful - redirect to new book record.
          res.redirect(book.url);
        }
      });
    },
  ],

  // Display book delete form on GET
  book_delete_get(req, res, next) {
    async.parallel({
      book(callback) {
        Book.findById(req.params.id).populate('author').populate('genre').exec(callback);
      },
      book_bookinstances(callback) {
        BookInstance.find({ book: req.params.id }).exec(callback);
      },
    }, (err, results) => {
      if (err) {
        next(err);
      } else if (results.book == null) { // No results.
        res.redirect('/catalog/books');
      } else {
        // Successful, so render
        res.render('book_delete', { title: 'Delete Book', book: results.book, book_instances: results.book_bookinstances });
      }
    });
  },

  // Handle book delete on POST
  book_delete_post(req, res, next) {
    // Assume the post has valid id (ie no validation/sanitization).

    async.parallel({
      book(callback) {
        Book.findById(req.params.id).populate('author').populate('genre').exec(callback);
      },
      book_bookinstances(callback) {
        BookInstance.find({ book: req.params.id }).exec(callback);
      },
    }, (err, results) => {
      if (err) {
        next(err);
      } else if (results.book_bookinstances.length > 0) {
        // Book has book_instances. Render in same way as for GET route.
        res.render('book_delete', { title: 'Delete Book', book: results.book, book_instances: results.book_bookinstances });
      } else {
        // Book has no BookInstance objects. Delete object and redirect to the list of books.
        Book.findByIdAndRemove(req.body.id, (e) => {
          if (e) {
            next(e);
          } else {
            // Success - got to books list
            res.redirect('/catalog/books');
          }
        });
      }
    });
  },

  // Display book update form on GET.
  book_update_get(req, res, next) {
    // Get book, authors and genres for form.
    async.parallel({
      book(callback) {
        Book.findById(req.params.id).populate('author').populate('genre').exec(callback);
      },
      authors(callback) {
        Author.find(callback);
      },
      genres(callback) {
        Genre.find(callback);
      },
    }, (err, results) => {
      if (err) {
        next(err);
      } else if (results.book == null) { // No results.
        const e = new Error('Book not found');
        e.status = 404;
        next(e);
      } else {
        // Mark our selected genres as checked
        for (let i = 0; i < results.genres.length; i += 1) {
          for (let j = 0; j < results.book.genre.length; j += 1) {
            if (results.genres[i]._id.toString() === results.book.genre[j]._id.toString()) {
              results.genres[i].checked = 'true';
            }
          }
        }

        res.render('book_form', {
          title: 'Update Book', authors: results.authors, genres: results.genres, book: results.book,
        });
      }
    });
  },

  // Handle book update on POST
  book_update_post: [

    // Convert the genre to an array
    (req, res, next) => {
      if (!(req.body.genre instanceof Array)) {
        if (typeof req.body.genre === 'undefined') { req.body.genre = []; } else { req.body.genre = new Array(req.body.genre); }
      }
      next();
    },

    // Validate fields
    body('title', 'Title must not be empty.').isLength({ min: 1 }).trim(),
    body('author', 'Author must not be empty.').isLength({ min: 1 }).trim(),
    body('summary', 'Summary must not be empty.').isLength({ min: 1 }).trim(),
    body('isbn', 'ISBN must not be empty').isLength({ min: 1 }).trim(),

    // Sanitize fields
    sanitizeBody('title').trim().escape(),
    sanitizeBody('author').trim().escape(),
    sanitizeBody('summary').trim().escape(),
    sanitizeBody('isbn').trim().escape(),
    sanitizeBody('genre.*').trim().escape(),

    // Process request after validation and sanitization
    (req, res, next) => {
      // Extract the validation errors from a request
      const errors = validationResult(req);

      // Create a Book object with escaped/trimmed data and old id.
      const book = new Book({
        title: req.body.title,
        author: req.body.author,
        summary: req.body.summary,
        isbn: req.body.isbn,
        genre: (typeof req.body.genre === 'undefined') ? [] : req.body.genre,
        _id: req.params.id, // This is required, or a new ID will be assigned!
      });

      if (!errors.isEmpty()) {
        // There are errors. Render form again with sanitized values/error messages.

        // Get all authors and genres for form
        async.parallel({
          authors(callback) {
            Author.find(callback);
          },
          genres(callback) {
            Genre.find(callback);
          },
        }, (err, results) => {
          if (err) {
            next(err);
          } else {
            // Mark our selected genres as checked
            for (let i = 0; i < results.genres.length; i += 1) {
              if (book.genre.indexOf(results.genres[i]._id) > -1) {
                results.genres[i].checked = 'true';
              }
            }

            res.render('book_form', {
              title: 'Update Book', authors: results.authors, genres: results.genres, book, errors: errors.array(),
            });
          }
        });
      } else {
        // Data from form is valid. Update the record.
        Book.findByIdAndUpdate(req.params.id, book, {}, (err, thebook) => {
          if (err) {
            next(err);
          } else {
            // Successful - redirect to book detail page.
            res.redirect(thebook.url);
          }
        });
      }
    },
  ],
};
