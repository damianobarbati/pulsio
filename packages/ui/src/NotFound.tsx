export const NotFound = () => {
  return (
    <div className="flex flex-col justify-center pt-[20%] text-center">
      <span className="font-black text-6xl text-pulsio-blue tracking-tighter">Ops!</span>
      <h1 className="mt-2 font-bold text-2xl text-pulsio-blue">This page was not found.</h1>
      <button type="button" onClick={() => window.history.back()} className="mt-6 font-medium text-pulsio-ink hover:underline focus-visible:outline-none">
        ← Go back
      </button>
    </div>
  );
};

export default NotFound;
