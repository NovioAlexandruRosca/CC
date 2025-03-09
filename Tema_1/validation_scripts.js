const validateBookData = (data, isRequired = true) => {
  const errors = [];

  if (isRequired) {
    if (!data.title) errors.push('Title is required');
    if (!data.author) errors.push('Author is required');
  }

  if (data.published_year && isNaN(data.published_year)) {
    errors.push('Published year must be a number');
  }

  return errors;
};


const validateAuthorData = (data, isRequired = true) => {
  const errors = [];

  if (isRequired && !data.name) {
    errors.push('Name is required');
  }

  if (data.birth_year && isNaN(data.birth_year)) {
    errors.push('Birth year must be a number');
  }

  return errors;
};

module.exports = {validateAuthorData, validateBookData};