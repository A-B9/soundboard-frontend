import './Pagination.css';

interface PaginationProps {
  /** Zero-based page index, as the backend reports it. */
  page: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  onPageChange: (page: number) => void;
}

function Pagination({ page, totalPages, first, last, onPageChange }: PaginationProps) {
  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        disabled={first}
        onClick={() => onPageChange(page - 1)}
      >
        ← Previous
      </button>
      <span className="pagination-status">
        Page {page + 1} of {totalPages}
      </span>
      <button
        type="button"
        disabled={last}
        onClick={() => onPageChange(page + 1)}
      >
        Next →
      </button>
    </nav>
  );
}

export default Pagination;
