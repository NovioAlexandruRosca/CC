import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./BookList.css";

const BookList = () => {
  const [books, setBooks] = useState([]);
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

  // Fetch books from the API
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

  // Fetch books when the component mounts
  useEffect(() => {
    fetchBooks();
  }, []);

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchBooks(newPage, pagination.limit);
    }
  };

  // Navigate to the book details page
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

      // Close the modal and reset the form
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

      // Update the local state to remove the book
      setBooks((prevBooks) => prevBooks.filter((book) => book.id !== bookId));
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="book-list">
      {/* Add Book Button */}
      <button
        className="add-book-button"
        onClick={() => setIsModalOpen(true)}
      >
        Add Book
      </button>

      {/* Modal for Adding a Book */}
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
      <div className="books-container">
        {books.map((book) => (
          <div
            key={book.id}
            className="book-card"
            onClick={() => handleCardClick(book.title)}
          >
            <button
              className="close-button"
              onClick={(e) => {
                e.stopPropagation(); // Stop event propagation
                handleRemoveBook(book.id); // Call the remove function
              }}
            >
              ×
            </button>
            {/* Book Cover */}
            {book.isbn && (
              <img
                // src={`https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`}
                alt={`${book.title} Cover`}
                className="book-cover"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/150x200?text=No+Cover"; // Fallback image
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

      {/* Pagination Controls */}
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
  );
};

export default BookList;