import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./BookDetails.css";

const BookDetails = () => {
   const [similarBooks, setSimilarBooks] = useState([]);
  const { title } = useParams();
  const [books, setBooks] = useState([]);
  const [mainBook, setMainBook] = useState([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);

  // Fetch detailed book information
  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        const response = await fetch("http://localhost:8001/api/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: decodeURIComponent(title), similar: true }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch book details");
        }

        const data = await response.json();
        setBooks(data.books);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchBooks = async (query) => {
      try {
        const response = await fetch(`http://localhost:8001/api/books?query=${query}&max_results=1`);
        if (!response.ok) {
          throw new Error("Failed to fetch books");
        }
        const data = await response.json();
        if (data.books && data.books.length > 0) {
          setMainBook(data.books[0]); // Update state only if data is valid
        } else {
          console.log("No books found in the response");
        }
      } catch (error) {
        console.error("Error fetching books:", error);
      }
    };

    fetchBookDetails();
    fetchBooks(decodeURIComponent(title));
  }, [title]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(
          `http://localhost:8001/api/book-reviews?title=${title}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch reviews");
        }
        const data = await response.json();
        console.log("Review", data)
        setReviews(data.reviews);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }

    };

    fetchReviews();
  }, [title]); // Fetch reviews whenever mainBook changes

  // This useEffect listens for changes to mainBook and logs it when updated.
  useEffect(() => {
    if (mainBook && mainBook.length > 0) {
      console.log("Updated mainBook:", mainBook);
    }
  }, [mainBook]);

  useEffect(() => {
      const fetchSimilarBooks = async () => {
        if (mainBook && mainBook.authors) {
          try {
            const author = mainBook.authors[0]; // Use the first author
            const response = await fetch(
              `http://localhost:8001/api/books-by-author?author=${encodeURIComponent(author)}`
            );
            if (!response.ok) {
              throw new Error("Failed to fetch similar books");
            }
            const data = await response.json();
            setSimilarBooks(data.books);
          } catch (error) {
            setError(error.message);
          } finally {
            setLoading(false);
          }
        }
      };

      fetchSimilarBooks();
    }, [mainBook]);

  // Fetch book summary
  const fetchSummary = async (title, author) => {
    setSummaryLoading(true);
    try {
      const response = await fetch("http://localhost:8001/api/book/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "title":title , "author": author }), // Ensure this matches the backend's expected format
      });

      if (!response.ok) {
        throw new Error("Failed to fetch book summary");
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      setError(error.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleBookSelect = (event) => {
    const selectedTitle = event.target.value;
    const selected = similarBooks.find((book) => book.title === selectedTitle);
    setSelectedBook(selected);
  };

  // Navigate back to the book list
  const handleBack = () => {
    navigate("/");
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
  <div className="book-details">
    {/* Back Button */}
    <button onClick={handleBack} className="back-button">
      &larr; Back to Book List
    </button>

    {/* Display First Book */}
    {books.length > 0 && (
      <div className="first-book">
        <h1>{decodeURIComponent(title)}</h1>

        {/* Book Image and Details Container */}
        <div className="book-info-container">
          {/* Book Image */}


          {/* Book Details */}
          <div className="details">
            {books[0].cover_edition_key && (
            <img
              src={`https://covers.openlibrary.org/b/olid/${books[0].cover_edition_key}-L.jpg`}
              alt={`${books[0].title} Cover`}
              className="book-coverr"
              onError={(e) => {
                e.target.src = "https://via.placeholder.com/150x200?text=No+Cover"; // Fallback image
              }}
            />
          )}
            <h2>Book Details</h2>
            {mainBook.title && (
              <p>
                <strong>Title:</strong> {mainBook.title}
              </p>
            )}

            {mainBook.authors && mainBook.authors.length > 0 && (
              <p>
                <strong>Authors:</strong> {mainBook.authors.join(", ")}
              </p>
            )}

            {mainBook.publisher && (
              <p>
                <strong>Publisher:</strong> {mainBook.publisher}
              </p>
            )}

            {mainBook.published_date && (
              <p>
                <strong>Published Date:</strong> {mainBook.published_date}
              </p>
            )}

            {books[0].author_key && books[0].author_key.length > 0 && (
              <p>
                <strong>Author Keys:</strong> {books[0].author_key.join(", ")}
              </p>
            )}

            {books[0].edition_count && (
              <p>
                <strong>Edition Count:</strong> {books[0].edition_count}
              </p>
            )}

            {books[0].first_publish_year && (
              <p>
                <strong>First Publish Year:</strong> {books[0].first_publish_year}
              </p>
            )}

            {books[0].cover_edition_key && (
              <p>
                <strong>Cover Edition Key:</strong> {books[0].cover_edition_key}
              </p>
            )}

            {books[0].cover_i && (
              <p>
                <strong>Cover ID:</strong> {books[0].cover_i}
              </p>
            )}

            {books[0].has_fulltext !== undefined && (
              <p>
                <strong>Has Full Text:</strong> {books[0].has_fulltext ? "Yes" : "No"}
              </p>
            )}

            {books[0].public_scan_b !== undefined && (
              <p>
                <strong>Public Scan:</strong> {books[0].public_scan_b ? "Yes" : "No"}
              </p>
            )}

            {mainBook.isbn && (
              <p>
                <strong>ISBN:</strong> {mainBook.isbn}
              </p>
            )}

            {mainBook.page_count && (
              <p>
                <strong>Page Count:</strong> {mainBook.page_count}
              </p>
            )}

            {mainBook.categories && mainBook.categories.length > 0 && (
              <p>
                <strong>Categories:</strong> {mainBook.categories.join(", ")}
              </p>
            )}

            {mainBook.language && (
              <p>
                <strong>Language:</strong> {mainBook.language}
              </p>
            )}

            {mainBook.preview_link && (
              <p>
                <strong>Preview Link:</strong> <a href={mainBook.preview_link} target="_blank" rel="noopener noreferrer">Read Preview</a>
              </p>
            )}

            {mainBook.buy_link && (
              <p>
                <strong>Buy Link:</strong> <a href={mainBook.buy_link} target="_blank" rel="noopener noreferrer">Buy Now</a>
              </p>
            )}

            {mainBook.price && mainBook.currency && (
              <p>
                <strong>Price:</strong> {mainBook.price} {mainBook.currency}
              </p>
            )}

            {mainBook.epub_available !== undefined && (
              <p>
                <strong>EPUB Available:</strong> {mainBook.epub_available ? "Yes" : "No"}
              </p>
            )}

            {mainBook.pdf_available !== undefined && (
              <p>
                <strong>PDF Available:</strong> {mainBook.pdf_available ? "Yes" : "No"}
              </p>
            )}

            {mainBook.web_reader_link && (
              <p>
                <strong>Web Reader Link:</strong> <a href={mainBook.web_reader_link} target="_blank" rel="noopener noreferrer">Read Online</a>
              </p>
            )}

            {books[0].language && books[0].language.length > 0 && (
              <p>
                <strong>Languages:</strong> {books[0].language.join(", ")}
              </p>
            )}

          </div>
        </div>

        {/* Get Book Summary Button */}
        <button
          onClick={() => fetchSummary(books[0]?.title, books[0]?.author_name[0])}
          className="summary-button"
          disabled={summaryLoading}
        >
          {summaryLoading ? "Fetching Summary..." : "Get Book Summary"}
        </button>

        <div className="book-reviews">
          <h2>Book Reviews</h2>
          {reviews.length === 0 ? (
            <p>No reviews found.</p>
          ) : (
            reviews.map((review, index) => (
              <div key={index} className="review">
                <h3>{review.book_title}</h3>
                {review.byline && (
                  <p>
                    <strong>Review by:</strong> {review.byline}
                  </p>
                )}

                {review.publication_date && (
                  <p>
                    <strong>Published on:</strong> {review.publication_date}
                  </p>
                )}

                {review.summary && (
                  <p>
                    <strong>Summary:</strong> {review.summary}
                  </p>
                )}

                <a
                  href={review.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="review-link"
                >
                  Read full review
                </a>
              </div>
            ))
          )}
        </div>

        {/* Display Summary */}
        {summary && (
          <div className="summary">
            <h2>Summary</h2>
            <p>{summary}</p>
          </div>
        )}
      </div>
    )}


  <div className="similar-books">
      <h2>Books by the Same Author</h2>
      {similarBooks.length === 0 ? (
        <p>No similar books found.</p>
      ) : (
        <div className="similar-books-dropdown">
          <select onChange={handleBookSelect}>
            <option value="">Select a book</option>
            {similarBooks.map((book, index) => (
              <option key={index} value={book.title}>
                {book.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Display Selected Book Details */}
      {selectedBook && (
        <div className="selected-book-details">
          <h3>{selectedBook.title}</h3>
          <p><strong>Authors:</strong> {selectedBook.authors.join(", ")}</p>
          <p><strong>Publisher:</strong> {selectedBook.publisher}</p>
          <p><strong>Published Date:</strong> {selectedBook.published_date}</p>
          <p>
            <strong>Description:</strong>{" "}
            {selectedBook.description.length > 100
              ? selectedBook.description.slice(0, 800) + "..."
              : selectedBook.description}
          </p>
          {selectedBook.cover_image && (
            <img
              src={selectedBook.cover_image}
              alt={`${selectedBook.title} Cover`}
              className="book-cover"
            />
          )}
        </div>
      )}
    </div>

    {/* Display Similar Books */}
    {books.length > 1 && (
      <div className="similar-books">
        <h2>Similar Books</h2>
        {books.slice(1).map((book, index) => (
          <div key={index} className="details">
            <h3>Book {index + 1}</h3>
            <p><strong>Title:</strong> {book.title}</p>
            <p><strong>Authors:</strong> {book.author_name.join(", ")}</p>
            <p><strong>Author Keys:</strong> {book.author_key.join(", ")}</p>
            <p><strong>Edition Count:</strong> {book.edition_count}</p>
            <p><strong>First Publish Year:</strong> {book.first_publish_year}</p>
            <p><strong>Languages:</strong> {book.language.join(", ")}</p>
            <p><strong>Key:</strong> {book.key}</p>
            <p><strong>Cover Edition Key:</strong> {book.cover_edition_key}</p>
            <p><strong>Cover ID:</strong> {book.cover_i}</p>
            <p><strong>Has Full Text:</strong> {book.has_fulltext ? "Yes" : "No"}</p>
            <p><strong>Public Scan:</strong> {book.public_scan_b ? "Yes" : "No"}</p>
          </div>
        ))}
      </div>
    )}
  </div>
);
};

export default BookDetails;