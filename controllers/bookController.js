const async = require('async');
const { body, validationResult } = require('express-validator');
const Book = require('../models/book');
const Author = require('../models/author');
const Genre = require('../models/genre');
const BookInstance = require('../models/bookinstance');

// helpers
const helperSort = require('../utils/sort');

/*
We could also include the next() function to be called if the method
does not complete the request cycle,
but in all these cases it does, so we've omitted it.
*/

// index() function for displaying the site welcome page (Home page)
// README: https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/Displaying_data/Home_page#controller
exports.index = function (req, res, next) {
  async.parallel(
    {
      // We can use ES6 object shorthand
      // Empty object as match condition to find all documents of this collection
      book_count(callback) {
        Book.countDocuments({}, callback);
      },
      book_instance_count(callback) {
        BookInstance.countDocuments({}, callback);
      },
      book_instance_available_count(callback) {
        BookInstance.countDocuments({ status: 'Available' }, callback);
      },
      author_count(callback) {
        Author.countDocuments({}, callback);
      },
      genre_count(callback) {
        Genre.countDocuments({}, callback);
      },
    },
    // 'render' second parameter is an object with the data for template view
    (err, results) => {
      if (err) {
        return next(err);
      }
      res.render('index', {
        title: 'Local Library Home',
        data: results,
      });
    }
  );
};

// Display list of all books.
exports.book_list = function (req, res, next) {
  // populate() is used for populating the data inside the reference.
  Book.find({}, 'title author')
    .populate('author')
    .exec((err, list_books) => {
      if (err) {
        return next(err);
      }
      // Sort
      helperSort.sortBooksList(list_books);
      // Successful, so render
      res.render('book_list', {
        title: 'Book List',
        book_list: list_books,
      });
    });
};

// Display detail page for a specific book.
exports.book_detail = function (req, res, next) {
  async.parallel(
    {
      book(callback) {
        Book.findById(req.params.id)
          .populate('author')
          .populate('genre')
          .exec(callback);
      },
      book_instance(callback) {
        BookInstance.find({ book: req.params.id }).exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.book == null) {
        // No results.
        const errBookNotFound = new Error('Book not found');
        errBookNotFound.status = 404;
        return next(errBookNotFound);
      }
      // Successful, so render.
      // 'title'is used to give name to the webpage (as defined in the header in 'layout.pug')
      res.render('book_detail', {
        title: results.book.title,
        book: results.book,
        genreLength: results.book.genre.length,
        book_instances: results.book_instance,
      });
    }
  );
};

// Display book create form on GET.
exports.book_create_get = function (req, res, next) {
  // Get all authors and genres thats exists in DB, which we can use for adding to our book.
  async.parallel(
    {
      authors(callback) {
        Author.find(callback);
      },
      genres(callback) {
        Genre.find(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      // Sort
      helperSort.sortAuthorsList(results.authors);
      // Successful, so render
      res.render('book_form', {
        title: 'Create Book',
        authors: results.authors,
        genres: results.genres,
      });
    }
  );
};

// Handle book create on POST.
exports.book_create_post = [
  // The form returns an array of Genre items (while for other fields it returns a string)
  // Convert the genre to an array.
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

  // Validate and sanitise fields.
  body('title', 'Title must not be empty.')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('author', 'Author must not be empty.')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('summary', 'Summary must not be empty.')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('isbn', 'ISBN must not be empty').trim().isLength({ min: 1 }).escape(),
  // wildcard (*) to individually validate each of the genre array entries
  body('genre.*').escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
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

      // Get all authors and genres for form.
      async.parallel(
        {
          authors(callback) {
            Author.find(callback);
          },
          genres(callback) {
            Genre.find(callback);
          },
        },
        (err, results) => {
          if (err) {
            return next(err);
          }
          // Mark our selected genres as checked.
          for (let i = 0; i < results.genres.length; i++) {
            if (book.genre.indexOf(results.genres[i]._id) > -1) {
              // Current genre is selected. Set "checked" flag.
              results.genres[i].checked = 'true';
            }
          }
          // Sort
          helperSort.sortAuthorsList(results.authors);
          // Successful, so render
          res.render('book_form', {
            title: 'Create Book',
            authors: results.authors,
            genres: results.genres,
            book,
            errors: errors.array(),
          });
        }
      );
    } else {
      // Data from form is valid. Save book.
      book.save((err) => {
        if (err) {
          return next(err);
        }
        // successful - redirect to new book record.
        res.redirect(book.url);
      });
    }
  },
];

// Display book delete form on GET.
exports.book_delete_get = function (req, res, next) {
  async.parallel(
    {
      book(callback) {
        Book.findById(req.params.id).exec(callback);
      },
      bookInstance_list(callback) {
        BookInstance.find({ book: req.params.id }).exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.book == null) {
        // No results.
        res.redirect('/catalog/books');
      }
      // Successful, so render.
      res.render('book_delete', {
        title: 'Delete Book',
        book: results.book,
        bookInstance_list: results.bookInstance_list,
        instance_list_length: results.bookInstance_list.length,
      });
    }
  );
};

// Handle book delete on POST.
exports.book_delete_post = function (req, res, next) {
  async.parallel(
    {
      book(callback) {
        Book.findById(req.body.bookId).exec(callback);
      },
      bookInstance_list(callback) {
        BookInstance.find({ book: req.body.bookId }).exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      // Success
      if (results.bookInstance_list.length > 0) {
        // Book has book instances. Render in same way as for GET route.
        res.render('book_delete', {
          title: 'Delete Book',
          book: results.book,
          bookInstance_list: results.bookInstance_list,
          instance_list_length: results.bookInstance_list.length,
        });
      } else {
        // Book has no book instances. Delete object and redirect to the list of books.
        Book.findByIdAndRemove(req.body.bookId, (err) => {
          if (err) {
            return next(err);
          }
          // Success - go to author list
          res.redirect('/catalog/books');
        });
      }
    }
  );
};

// Display book update form on GET.
exports.book_update_get = function (req, res, next) {
  // Get book, authors and genres for form.
  async.parallel(
    {
      book(callback) {
        Book.findById(req.params.id)
          .populate('author')
          .populate('genre')
          .exec(callback);
      },
      authors(callback) {
        Author.find(callback);
      },
      genres(callback) {
        Genre.find(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.book == null) {
        // No results.
        const errBookNotFound = new Error('Book not found');
        errBookNotFound.status = 404;
        return next(errBookNotFound);
      }
      // Success.
      // Mark our selected genres as checked.
      for (
        let genreIterator = 0;
        genreIterator < results.genres.length;
        genreIterator++
      ) {
        for (
          let bookIterator = 0;
          bookIterator < results.book.genre.length;
          bookIterator++
        ) {
          if (
            results.genres[genreIterator]._id.toString() ===
            results.book.genre[bookIterator]._id.toString()
          ) {
            results.genres[genreIterator].checked = 'true';
          }
        }
      }
      // Sort
      helperSort.sortAuthorsList(results.authors);
      // Successful, so render
      res.render('book_form', {
        title: 'Update Book',
        authors: results.authors,
        genres: results.genres,
        book: results.book,
      });
    }
  );
};

// Handle book update on POST.
exports.book_update_post = [
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

  // Validate and sanitise fields.
  body('title', 'Title must not be empty.')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('author', 'Author must not be empty.')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('summary', 'Summary must not be empty.')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('isbn', 'ISBN must not be empty').trim().isLength({ min: 1 }).escape(),
  body('genre.*').escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Book object with escaped/trimmed data and old id.
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: typeof req.body.genre === 'undefined' ? [] : req.body.genre,
      _id: req.params.id, // This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all authors and genres for form.
      async.parallel(
        {
          authors(callback) {
            Author.find(callback);
          },
          genres(callback) {
            Genre.find(callback);
          },
        },
        (err, results) => {
          if (err) {
            return next(err);
          }

          // Mark our selected genres as checked.
          for (let i = 0; i < results.genres.length; i++) {
            if (book.genre.indexOf(results.genres[i]._id) > -1) {
              results.genres[i].checked = 'true';
            }
          }
          // Sort
          helperSort.sortAuthorsList(results.authors);
          // Successful, so render
          res.render('book_form', {
            title: 'Update Book',
            authors: results.authors,
            genres: results.genres,
            book,
            errors: errors.array(),
          });
        }
      );
    } else {
      // Data from form is valid. Update the record.
      Book.findByIdAndUpdate(req.params.id, book, {}, (err, thebook) => {
        if (err) {
          return next(err);
        }
        // Successful - redirect to book detail page.
        res.redirect(thebook.url);
      });
    }
  },
];
