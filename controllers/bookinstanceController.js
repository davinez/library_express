const { body, validationResult } = require('express-validator');
const async = require('async');
const BookInstance = require('../models/bookinstance');
const Book = require('../models/book');
// helpers
const helperSort = require('../utils/sort');

/*
We could also include the next() function to be called if the method
does not complete the request cycle,
but in all these cases it does, so we've omitted it.
*/

// Display list of all BookInstances.
exports.bookinstance_list = function (req, res, next) {
  BookInstance.find()
    .populate('book')
    .exec((err, list_bookinstances) => {
      if (err) {
        return next(err);
      }
      // Successful, so render
      res.render('bookinstance_list', {
        title: 'Book Instance List',
        bookinstance_list: list_bookinstances,
      });
    });
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function (req, res, next) {
  BookInstance.findById(req.params.id)
    .populate('book')
    .exec((err, bookinstance) => {
      if (err) {
        return next(err);
      }
      if (bookinstance == null) {
        // No results.
        const errBookInsNotFound = new Error('Book copy not found');
        errBookInsNotFound.status = 404;
        return next(errBookInsNotFound);
      }
      // Successful, so render.
      res.render('bookinstance_detail', {
        title: `Copy: ${bookinstance.book.title}`,
        bookinstance,
      });
    });
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function (req, res, next) {
  // gets a list of all books (book_list)
  Book.find({}, 'title').exec((err, books) => {
    if (err) {
      return next(err);
    }
    // Sort
    helperSort.sortBooksList(books);
    // Successful, so render.
    res.render('bookinstance_form', {
      title: 'Create BookInstance',
      book_list: books,
    });
  });
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
  // Validate and sanitise fields.
  body('book', 'Book must be specified').trim().isLength({ min: 1 }).escape(),
  body('imprint', 'Imprint must be specified')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('status').escape(),
  body('due_back', 'Invalid date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization.
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
      Book.find({}, 'title').exec((err, books) => {
        if (err) {
          return next(err);
        }
        // Sort
        helperSort.sortBooksList(books);
        // Successful, so render.
        res.render('bookinstance_form', {
          title: 'Create BookInstance',
          book_list: books,
          errors: errors.array(),
          bookinstance,
        });
      });
    } else {
      // Data from form is valid.
      bookinstance.save((err) => {
        if (err) {
          return next(err);
        }
        // Successful - redirect to new record.
        res.redirect(bookinstance.url);
      });
    }
  },
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function (req, res, next) {
  BookInstance.findById(req.params.id)
    .populate('book')
    .exec((err, bookinstance) => {
      if (err) {
        return next(err);
      }
      if (bookinstance == null) {
        // No results.
        res.redirect('/catalog/bookinstances');
      }
      // Successful, so render.
      res.render('bookInstance_delete', {
        title: 'Delete Book Instance',
        bookinstance,
      });
    });
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function (req, res, next) {
  BookInstance.findById(req.params.id).exec((err, results) => {
    if (err) {
      return next(err);
    }
    // Success
    // Delete Book Instance and redirect to the list of Book Instances.
    BookInstance.findByIdAndRemove(req.body.bookinstanceID, (err) => {
      if (err) {
        return next(err);
      }
      // Success - go to author list
      res.redirect('/catalog/bookinstances');
    });
  });
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function (req, res, next) {
  // Get book titles and current Book Instance
  async.parallel(
    {
      bookinstance(callback) {
        BookInstance.findById(req.params.id).exec(callback);
      },
      books(callback) {
        Book.find({}, 'title').exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.bookinstance == null) {
        // No results.
        const errBookInstanceNotFound = new Error('Book Copy not found');
        errBookInstanceNotFound.status = 404;
        return next(errBookInstanceNotFound);
      }
      // Success.
      // Sort
      helperSort.sortBooksList(results.books);
      // Successful, so render
      res.render('bookinstance_form', {
        title: 'Update Book Instance',
        bookinstance: results.bookinstance,
        book_list: results.books,
      });
    }
  );
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [
  // Validate and sanitise fields.
  body('book', 'Book must be specified').trim().isLength({ min: 1 }).escape(),
  body('imprint', 'Imprint must be specified')
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body('status').escape(),
  body('due_back', 'Invalid date')
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data.
    const bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
      _id: req.params.id, // This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all books and current Book instance for form.
      async.parallel(
        {
          bookinstance(callback) {
            BookInstance.findById(req.params.id).exec(callback);
          },
          books(callback) {
            Book.find({}, 'title').exec(callback);
          },
        },
        (err, results) => {
          if (err) {
            return next(err);
          }
          // Sort
          helperSort.sortBooksList(results.books);
          // Successful, so render
          res.render('bookinstance_form', {
            title: 'Update Book Instance',
            bookinstance: results.bookinstance,
            book_list: results.books,
          });
        }
      );
    } else {
      // Data from form is valid. Update the record.
      BookInstance.findByIdAndUpdate(
        req.params.id,
        bookinstance,
        {},
        (err, updatedBookInstance) => {
          if (err) {
            return next(err);
          }
          // Successful - redirect to book instance detail page.
          res.redirect(updatedBookInstance.url);
        }
      );
    }
  },
];
