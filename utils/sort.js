exports.sortBooksList = function (list_books) {
  // mutates original array
  list_books.sort((a, b) => {
    const textA = a.title.toUpperCase();
    const textB = b.title.toUpperCase();
    if (textA < textB) {
      return -1;
    }
    if (textA > textB) {
      return 1;
    }
    return 0;
  });
};

exports.sortAuthorsList = function (list_authors) {
  // mutates original array
  list_authors.sort((a, b) => {
    const textA = a.family_name.toUpperCase();
    const textB = b.family_name.toUpperCase();
    if (textA < textB) {
      return -1;
    }
    if (textA > textB) {
      return 1;
    }
    return 0;
  });
};
