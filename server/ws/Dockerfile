FROM denoland/deno:alpine-1.40.2

WORKDIR /app

# Copy the application files
COPY . .

# Expose the port
EXPOSE 8000

# Set environment variables
ENV DENO_ENV=production

# Run the application
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "ws.ts"]