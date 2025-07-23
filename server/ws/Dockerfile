FROM denoland/deno:latest

WORKDIR /app

# Copy only the necessary files first (not the lock file)
COPY ws.ts .
COPY deno.json .

# Expose the port
EXPOSE 8000

# Set environment variables
ENV DENO_ENV=production

# Run the application without using the lock file
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "--no-lock", "ws.ts"]