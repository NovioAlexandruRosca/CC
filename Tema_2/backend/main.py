from fastapi import FastAPI, HTTPException
import requests
from pydantic import BaseModel
import httpx
from starlette.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
GOOGLE_BOOKS_API_URL = os.getenv('GOOGLE_BOOKS_API_URL')
NY_TIMES_API_URL = os.getenv('NY_TIMES_API_URL')
NY_TIMES_API_KEY = os.getenv('NY_TIMES_API_KEY')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class BookRequest(BaseModel):
    title: str
    similar: bool

class BookSummaryRequest(BaseModel):
    title: str
    author: str

@app.get("/fetch-books")
async def fetch_books(
    genre: str = None,
    author: str = None,
    year: int = None,
    sort: str = None,
    order: str = None,
    limit: int = 10,
    page: int = 1,
):
    params = {
        "genre": genre,
        "author": author,
        "year": year,
        "sort": sort,
        "order": order,
        "limit": limit,
        "page": page,
    }

    params = {k: v for k, v in params.items() if v is not None}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get("http://localhost:8000/books", params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/add-book")
async def add_book(book_data: dict):
    if book_data.get("title"):
        fetched_data = await fetch_book_details(book_data["title"])
        if fetched_data:
            book_data = {
                **fetched_data,
                **book_data,
            }

    if "published_year" in book_data:
        book_data["published_year"] = int(book_data["published_year"])

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "http://localhost:8000/books",
                json=book_data,
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


def fetch_summary(title, author):
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "cognitivecomputations/dolphin3.0-r1-mistral-24b:free",
        "messages": [{"role": "user", "content": f"short description of the book {title} by {author}"}]
    }

    response = requests.post(url, headers=headers, json=payload)
    if response.status_code == 200:
        return response.json().get("choices", [{}])[0].get("message", {}).get("content", "Summary not available.")
    return "Summary not available."


@app.get("/api/books")
async def get_books(query: str, max_results: int = 1):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                GOOGLE_BOOKS_API_URL,
                params={"q": query, "key": GOOGLE_API_KEY, "maxResults": max_results},
            )
            response.raise_for_status()
            data = response.json()

        books = []
        for item in data.get("items", []):
            volume_info = item.get("volumeInfo", {})
            sale_info = item.get("saleInfo", {})
            access_info = item.get("accessInfo", {})
            search_info = item.get("searchInfo", {})

            book = {
                "title": volume_info.get("title"),
                "authors": volume_info.get("authors", []),
                "publisher": volume_info.get("publisher"),
                "published_date": volume_info.get("publishedDate"),
                "description": volume_info.get("description"),
                "isbn": next(
                    (
                        identifier.get("identifier")
                        for identifier in volume_info.get("industryIdentifiers", [])
                        if identifier.get("type") == "ISBN_13"
                    ),
                    None,
                ),
                "page_count": volume_info.get("pageCount"),
                "categories": volume_info.get("categories", []),
                "language": volume_info.get("language"),
                "cover_image": volume_info.get("imageLinks", {}).get("thumbnail"),
                "preview_link": volume_info.get("previewLink"),
                "buy_link": sale_info.get("buyLink"),
                "price": sale_info.get("listPrice", {}).get("amount"),
                "currency": sale_info.get("listPrice", {}).get("currencyCode"),
                "epub_available": access_info.get("epub", {}).get("isAvailable"),
                "pdf_available": access_info.get("pdf", {}).get("isAvailable"),
                "web_reader_link": access_info.get("webReaderLink"),
                "search_snippet": search_info.get("textSnippet"),
            }
            books.append(book)

        return {"books": books}
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/book")
async def get_book(book: BookRequest):
    print(f"Received book title: {book.title}")
    try:
        openlibrary_url = f"https://openlibrary.org/search.json?title={book.title}"
        async with httpx.AsyncClient() as client:
            response = await client.get(openlibrary_url)
            response.raise_for_status()
            data = response.json()

        if data.get("numFound", 0) == 0:
            raise HTTPException(status_code=404, detail="Book not found")

        books = []
        for doc in data.get("docs", []):
            book_info = {
                "title": doc.get("title"),
                "author_key": doc.get("author_key", []),
                "author_name": doc.get("author_name", []),
                "edition_count": doc.get("edition_count"),
                "first_publish_year": doc.get("first_publish_year"),
                "language": doc.get("language", []),
                "key": doc.get("key"),
                "cover_edition_key": doc.get("cover_edition_key"),
                "cover_i": doc.get("cover_i"),
                "has_fulltext": doc.get("has_fulltext"),
                "public_scan_b": doc.get("public_scan_b"),
            }
            books.append(book_info)
            if not book.similar:
                break
            elif len(books) == 10:
                break

        return {"books": books}
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def fetch_book_details(title: str):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                GOOGLE_BOOKS_API_URL,
                params={"q": f"{title}", "api-key": GOOGLE_API_KEY},
            )
            response.raise_for_status()
            data = response.json()

            if data.get("items"):
                volume_info = data["items"][0].get("volumeInfo", {})
                return {
                    "title": volume_info.get("title"),
                    "authors": volume_info.get("authors", []),
                    "publisher": volume_info.get("publisher"),
                    "published_date": volume_info.get("publishedDate"),
                    "categories": volume_info.get("categories", []),
                    "isbn": next(
                        (
                            identifier.get("identifier")
                            for identifier in volume_info.get("industryIdentifiers", [])
                            if identifier.get("type") == "ISBN_13"
                        ),
                        None,
                    ),
                }
            else:
                return None
    except Exception as e:
        print(f"Error fetching book details: {e}")
        return None


@app.delete("/delete-book/{book_id}")
async def delete_book(book_id: int):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.delete(
                f"http://localhost:8000/books/{book_id}",
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/book/summary")
async def get_book_summary(request: BookSummaryRequest):
    try:
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "cognitivecomputations/dolphin3.0-r1-mistral-24b:free",
            "messages": [{"role": "user", "content": f"short description of the book {request.title} by {request.author}"}],
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()

        summary = data.get("choices", [{}])[0].get("message", {}).get("content", "Summary not available.")
        return {"summary": summary}
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/book-reviews")
async def get_book_reviews(title: str):
    try:
        # Call the NY Times API
        async with httpx.AsyncClient() as client:
            response = await client.get(
                NY_TIMES_API_URL,
                params={"title": title, "api-key": NY_TIMES_API_KEY},
            )
            response.raise_for_status()  # Raise an error for bad responses (4xx, 5xx)
            data = response.json()

        # Extract relevant data from the NY Times API response
        reviews = []
        for result in data.get("results", []):
            review = {
                "url": result.get("url"),
                "publication_date": result.get("publication_dt"),
                "byline": result.get("byline"),
                "book_title": result.get("book_title"),
                "book_author": result.get("book_author"),
                "summary": result.get("summary"),
                "isbn13": result.get("isbn13", [])[0] if result.get("isbn13") else None,
            }
            reviews.append(review)

        return {"reviews": reviews}
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/books-by-author")
async def get_books_by_author(author: str, max_results: int = 10):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                GOOGLE_BOOKS_API_URL,
                params={"q": f"inauthor:{author}", "maxResults": max_results},
            )
            response.raise_for_status()
            data = response.json()

        books = []
        for item in data.get("items", []):
            volume_info = item.get("volumeInfo", {})
            book = {
                "title": volume_info.get("title"),
                "authors": volume_info.get("authors", []),
                "publisher": volume_info.get("publisher"),
                "published_date": volume_info.get("publishedDate"),
                "description": volume_info.get("description"),
                "isbn": next(
                    (
                        identifier.get("identifier")
                        for identifier in volume_info.get("industryIdentifiers", [])
                        if identifier.get("type") == "ISBN_13"
                    ),
                    None,
                ),
                "cover_image": volume_info.get("imageLinks", {}).get("thumbnail"),
            }
            books.append(book)

        return {"books": books}
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))