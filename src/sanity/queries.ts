/**
 * GROQ queries for Sanity Content Lake.
 * Draft documents are strictly excluded.
 */

/**
 * Listing query: retrieves metadata for Field Note cards only.
 * Portable Text bodies are intentionally omitted to avoid over-fetching.
 */
export const FIELD_NOTES_LIST_QUERY = `*[_type == "fieldNote" && !(_id in path("drafts.**"))] | order(publicationDate desc) {
  _id,
  title,
  "slug": slug.current,
  "date": publicationDate,
  "summary": excerpt,
  category,
  tags,
  readTime,
  externalLink,
  featured,
  featuredImage {
    ...,
    asset-> {
      _id,
      url,
      metadata {
        dimensions {
          width,
          height,
          aspectRatio
        }
      }
    }
  },
  featuredImageAlt
}`;

/**
 * Detail query: retrieves the complete document including Portable Text body for a specific slug.
 */
export const FIELD_NOTE_DETAIL_QUERY = `*[_type == "fieldNote" && slug.current == $slug && !(_id in path("drafts.**"))][0] {
  _id,
  title,
  "slug": slug.current,
  "date": publicationDate,
  "summary": excerpt,
  category,
  tags,
  readTime,
  externalLink,
  featured,
  seoTitle,
  seoDescription,
  featuredImage {
    ...,
    asset-> {
      _id,
      url,
      metadata {
        dimensions {
          width,
          height,
          aspectRatio
        }
      }
    }
  },
  featuredImageAlt,
  body[] {
    ...,
    _type == "image" => {
      ...,
      asset-> {
        _id,
        url,
        metadata {
          dimensions {
            width,
            height,
            aspectRatio
          }
        }
      }
    }
  }
}`;

/**
 * Galleries query: retrieves photography collections ordered by displayOrder ascending,
 * with ordered photo references dereferenced.
 */
export const GALLERIES_QUERY = `*[_type == "gallery" && !(_id in path("drafts.**"))] | order(displayOrder asc) {
  _id,
  "id": slug.current,
  title,
  description,
  "date": publicationDate,
  displayOrder,
  category,
  featured,
  coverImage {
    ...,
    asset-> {
      _id,
      url,
      metadata {
        dimensions {
          width,
          height,
          aspectRatio
        }
      }
    }
  },
  coverImageAlt,
  "photos": photos[]-> {
    _id,
    title,
    alt,
    caption,
    datePhotographed,
    location,
    tags,
    image {
      ...,
      asset-> {
        _id,
        url,
        metadata {
          dimensions {
            width,
            height,
            aspectRatio
          }
        }
      }
    }
  }
}`;
