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
          setMainBook(data.books[0]);
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
  }, [title]);

  useEffect(() => {
    if (mainBook && mainBook.length > 0) {
      console.log("Updated mainBook:", mainBook);
    }
  }, [mainBook]);

  useEffect(() => {
      const fetchSimilarBooks = async () => {
        if (mainBook && mainBook.authors) {
          try {
            const author = mainBook.authors[0];
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

  const fetchSummary = async (title, author) => {
    setSummaryLoading(true);
    try {
      const response = await fetch("http://localhost:8001/api/book/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "title":title , "author": author }),
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

  const handleBack = () => {
    navigate("/");
  };


  if (loading) return (
    <div className="loading-spinner">
      <div className="spinner"></div>
    </div>
  );

  if (error) return <div className="error">Error: {error}</div>;

  return (
  <div className="book-details">
    
    <button onClick={handleBack} className="back-button">
      &larr; Back to Book List
    </button>

    
    {books.length > 0 && (
      <div className="first-book">
        <h1>{decodeURIComponent(title)}</h1>

        
        <div className="book-detail-container">
  <div className="book-header">
    {books[0].cover_edition_key && (
      <div className="book-cover-container">
        <img
          src={`https://covers.openlibrary.org/b/olid/${books[0].cover_edition_key}-L.jpg`}
          alt={`${books[0].title} Cover`}
          className="book-cover-image"
          onError={(e) => {
            e.target.src = "https://via.placeholder.com/300x450?text=No+Cover";
          }}
        />
      </div>
    )}
    <div className="book-meta">
      <h1 className="book-title">{mainBook.title}</h1>

      <div className="author-section">
        <span className="meta-label">By</span>
        <span className="author-names">{mainBook.authors?.join(", ") || "Unknown Author"}</span>
      </div>

      <div className="quick-facts">
        {mainBook.published_date && (
          <div className="fact">
            <span className="fact-label">Published</span>
            <span className="fact-value">{mainBook.published_date}</span>
          </div>
        )}

        {mainBook.page_count && (
          <div className="fact">
            <span className="fact-label">Pages</span>
            <span className="fact-value">{mainBook.page_count}</span>
          </div>
        )}

        {mainBook.language && (
          <div className="fact">
            <span className="fact-label">Language</span>
            <span className="fact-value">{mainBook.language}</span>
          </div>
        )}
      </div>

      <div className="action-buttons">
        {mainBook.preview_link && (
          <a href={mainBook.preview_link} className="preview-btn" target="_blank" rel="noopener noreferrer">
            Read Preview
          </a>
        )}
        {mainBook.buy_link && (
          <a href={mainBook.buy_link} className="buy-btn" target="_blank" rel="noopener noreferrer">
            Buy Now {mainBook.price && mainBook.currency && (
              <span className="price">- {mainBook.price} {mainBook.currency}</span>
            )}
          </a>
        )}
      </div>
    </div>
  </div>

  <div className="book-details-grid">
    <div className="detail-section">
      <h3 className="section-title">Publication Details</h3>
      <div className="detail-item">
        <span className="detail-label">Publisher</span>
        <span className="detail-value">{mainBook.publisher || "N/A"}</span>
      </div>
      <div className="detail-item">
        <span className="detail-label">First Published</span>
        <span className="detail-value">{books[0].first_publish_year || "N/A"}</span>
      </div>
      <div className="detail-item">
        <span className="detail-label">Edition Count</span>
        <span className="detail-value">{books[0].edition_count || "N/A"}</span>
      </div>
    </div>

    <div className="detail-section">
      <h3 className="section-title">Technical Details</h3>
      <div className="detail-item">
        <span className="detail-label">ISBN</span>
        <span className="detail-value">{mainBook.isbn || "N/A"}</span>
      </div>
      <div className="detail-item">
        <span className="detail-label">Cover Edition Key</span>
        <span className="detail-value code">{books[0].cover_edition_key || "N/A"}</span>
      </div>
      <div className="detail-item">
        <span className="detail-label">Cover ID</span>
        <span className="detail-value code">{books[0].cover_i || "N/A"}</span>
      </div>
    </div>

    <div className="detail-section">
      <h3 className="section-title">Availability</h3>
      <div className="detail-item">
        <span className="detail-label">Full Text</span>
        <span className={`detail-value ${books[0].has_fulltext ? 'available' : 'unavailable'}`}>
          {books[0].has_fulltext ? "Available" : "Not Available"}
        </span>
      </div>
      <div className="detail-item">
        <span className="detail-label">Public Scan</span>
        <span className={`detail-value ${books[0].public_scan_b ? 'available' : 'unavailable'}`}>
          {books[0].public_scan_b ? "Available" : "Not Available"}
        </span>
      </div>
      <div className="detail-item">
        <span className="detail-label">EPUB</span>
        <span className={`detail-value ${mainBook.epub_available ? 'available' : 'unavailable'}`}>
          {mainBook.epub_available ? "Available" : "Not Available"}
        </span>
      </div>
      <div className="detail-item">
        <span className="detail-label">PDF</span>
        <span className={`detail-value ${mainBook.pdf_available ? 'available' : 'unavailable'}`}>
          {mainBook.pdf_available ? "Available" : "Not Available"}
        </span>
      </div>
    </div>

    <div className="detail-section">
      <h3 className="section-title">Additional Information</h3>
      <div className="detail-item">
        <span className="detail-label">Categories</span>
        <span className="detail-value">{mainBook.categories?.join(", ") || "N/A"}</span>
      </div>
      <div className="detail-item">
        <span className="detail-label">Languages</span>
        <span className="detail-value">{books[0].language?.join(", ") || "N/A"}</span>
      </div>
      <div className="detail-item">
        <span className="detail-label">Author Keys</span>
        <span className="detail-value code">{books[0].author_key?.join(", ") || "N/A"}</span>
      </div>
      {mainBook.web_reader_link && (
        <div className="detail-item">
          <span className="detail-label">Online Reader</span>
          <a href={mainBook.web_reader_link} className="detail-value link" target="_blank" rel="noopener noreferrer">
            Read Online
          </a>
        </div>
      )}
    </div>
  </div>
</div>

        
        <button
          onClick={() => fetchSummary(books[0]?.title, books[0]?.author_name[0])}
          className="summary-button"
          disabled={summaryLoading}
          style={{ marginTop: '30px' }}
        >
          {summaryLoading ? (
            <span className="summary-loading">
              <span className="mini-spinner"></span> Fetching Summary...
            </span>
          ) : "Get Book Summary"}
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

    
    {books.length > 1 && (
    <div className="similar-books-container">
      <h2 className="section-title">Similar Books</h2>
      <div className="book-details-grid">
        {books.slice(1).map((book, index) => (
          <div key={index} className="book-info-card">
            <div className="book-header">
              <h3 className="book-position">#{index + 1}</h3>
              <h3 className="book-title">{book.title}</h3>
            </div>

            <div className="book-details-section">
              <div className="detail-row">
                <span className="detail-label">Authors:</span>
                <span className="detail-value">{book.author_name?.join(", ") || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Author Keys:</span>
                <span className="detail-value">{book.author_key?.join(", ") || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Edition Count:</span>
                <span className="detail-value">{book.edition_count}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">First Published:</span>
                <span className="detail-value">{book.first_publish_year}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Languages:</span>
                <span className="detail-value">{book.language?.join(", ") || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Key:</span>
                <span className="detail-value code">{book.key}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Cover Edition:</span>
                <span className="detail-value code">{book.cover_edition_key || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Cover ID:</span>
                <span className="detail-value code">{book.cover_i || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Full Text:</span>
                <span className={`detail-value ${book.has_fulltext ? 'available' : 'unavailable'}`}>
                  {book.has_fulltext ? "Available" : "Not Available"}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Public Scan:</span>
                <span className={`detail-value ${book.public_scan_b ? 'available' : 'unavailable'}`}>
                  {book.public_scan_b ? "Available" : "Not Available"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )}
  </div>
);
};

export default BookDetails;