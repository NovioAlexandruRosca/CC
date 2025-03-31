import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./BookList.css";

const BookList = () => {
  const [books, setBooks] = useState([]);

  const [libraries, setLibraries] = useState([]);
  const [selectedLibrary, setSelectedLibrary] = useState(null);

  const [correlations, setCorrelations] = useState([]);

  const [pagination, setPagination] = useState({ page: 1, limit: 12, totalItems: 0, totalPages: 1 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBook, setNewBook] = useState({
    title: "",
    author: "",
    genre: "",
    published_year: "",
    isbn: "",
  });

  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  const fetchLibraries = async () => {
    try {
      const response = await axios.get("http://localhost:8001/libraries");
      setLibraries(response.data.data);
      if (response.data.data.length > 0) {
        setSelectedLibrary(response.data.data[0].id);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const fetchCorrelations = async () => {
    try {
      const response = await axios.get("http://localhost:8001/fetch-library-books");
      setCorrelations(response.data.data);
    } catch (error) {
      setError(error.message);
    }
  };

  const fetchBooks = async (page = 1, limit = 10) => {
    try {
      const params = {
        page,
        limit,
      };

      const response = await axios.get("http://localhost:8001/fetch-books", { params });
      setBooks(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraries();
    fetchCorrelations();
    fetchBooks();
  }, []);

  const handleLibraryChange = (e) => {
    const libraryId = e.target.value === "" ? null : e.target.value;
    setSelectedLibrary(libraryId);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchBooks(newPage, pagination.limit);
    }
  };

  const handleCardClick = (title) => {
    navigate(`/book/${encodeURIComponent(title)}`);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewBook((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const bookData = {
      title: newBook.title,
      author: newBook.author,
      genre: newBook.genre,
      published_year: parseInt(newBook.published_year, 10),
      isbn: newBook.isbn,
    };

    try {
      const response = await fetch("http://localhost:8001/add-book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.errors) {
          alert(`Validation errors: ${errorData.errors.join(", ")}`);
        } else {
          throw new Error(errorData.error || "Failed to add book");
        }
        return;
      }

      setIsModalOpen(false);
      setNewBook({ title: "", author: "", genre: "", published_year: "", isbn: "" });
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setNewBook({ title: "", author: "", genre: "", published_year: "", isbn: "" }); // Reset form
  };

  const handleRemoveBook = async (bookId) => {
    try {
      const response = await fetch(`http://localhost:8001/delete-book/${bookId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete book");
      }

      setBooks((prevBooks) => prevBooks.filter((book) => book.id !== bookId));
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const filteredBooks = (selectedLibrary
    ? books.filter(book =>
        correlations.some(corr =>
          corr.book_id === book.id && corr.library_id === parseInt(selectedLibrary)
        )
      )
    : books
  ).filter(book => {
    if (!searchTerm) return true;

    return (
      book.title.toLowerCase().includes(searchTerm) ||
      book.author.toLowerCase().includes(searchTerm) ||
      book.genre.toLowerCase().includes(searchTerm) ||
      book.published_year.toString().includes(searchTerm)
    );
  });

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
       <div className="book-list-container">
      
      <div className="library-selector">
        <h3>Libraries</h3>
        <select
          value={selectedLibrary || ""}
          onChange={handleLibraryChange}
          className="library-dropdown"
        >
          <option value="">All Libraries</option>
          {libraries.map((library) => (
            <option key={library.id} value={library.id}>
              {library.name} ({library.location})
            </option>
          ))}
        </select>

        <div className="search-bar" style={{ marginTop: '20px' }}>
        <h3>Search Book</h3>
        <input
          type="text"
          placeholder="Search books by title, author, genre, or year..."
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>
      </div>
    <div className="book-list">
      
      <button
        className="add-book-button"
        onClick={() => setIsModalOpen(true)}
      >
        Add Book
      </button>

      
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Add a New Book</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title:</label>
                <input
                  type="text"
                  name="title"
                  value={newBook.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Author:</label>
                <input
                  type="text"
                  name="author"
                  value={newBook.author}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Genre:</label>
                <input
                  type="text"
                  name="genre"
                  value={newBook.genre}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Published Year:</label>
                <input
                  type="number"
                  name="published_year"
                  value={newBook.published_year}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>ISBN:</label>
                <input
                  type="text"
                  name="isbn"
                  value={newBook.isbn}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={handleCancel}>
                  Cancel
                </button>
                <button type="submit">Add Book</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <h1>Book List</h1>

      
      {filteredBooks.length === 0 && (
        <div className="no-books-message">
          <p>No books found matching your criteria.</p>
          <button
            onClick={() => {
              setSelectedLibrary(null);
              setSearchTerm('');
            }}
            className="reset-filters"
          >
            Reset Filters
          </button>
        </div>
      )}

      <div className="books-container">
        {filteredBooks.map((book) => (
          <div
            key={book.id}
            className="book-card"
            onClick={() => handleCardClick(book.title)}
          >
            <button
              className="close-button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveBook(book.id);
              }}
            >
              ×
            </button>
            
            {book.isbn && (
              <img
                src={`https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`}
                alt={`${book.title} Cover`}
                className="book-cover"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/150x200?text=No+Cover";
                }}
              />
            )}
            <h2>{book.title}</h2>
            <p><strong>Author:</strong> {book.author}</p>
            <p><strong>Genre:</strong> {book.genre}</p>
            <p><strong>Year:</strong> {book.published_year}</p>
          </div>
        ))}
      </div>

      
      <div className="pagination">
        <button
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
        >
          Previous
        </button>
        <span>
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <button
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.totalPages}
        >
          Next
        </button>
      </div>
    </div>
       </div>
  );
};

export default BookList;