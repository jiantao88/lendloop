"use client";

export default function BoardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="banner" role="alert">
      <p>{error.message}</p>
      <button className="secondary" type="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
