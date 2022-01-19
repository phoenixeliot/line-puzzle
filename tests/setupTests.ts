import "regenerator-runtime/runtime";

// Check if useDefineForClassFields is working
if (
  !new (class {
    x;
  })().hasOwnProperty("x")
)
  throw new Error("Transpiler is not configured correctly");

// Print stack traces when there is unhandled promise rejection
if (!process.env.LISTENING_TO_UNHANDLED_REJECTION) {
  process.on("unhandledRejection", (reason) => {
    throw reason;
  });
  // Avoid memory leak by adding too many listeners
  process.env.LISTENING_TO_UNHANDLED_REJECTION = "true";
}
