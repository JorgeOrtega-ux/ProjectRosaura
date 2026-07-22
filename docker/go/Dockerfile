FROM golang:1.21-alpine

WORKDIR /app

COPY . .
RUN go mod tidy

RUN go build -o /canvas-go-service main.go

EXPOSE 8080

CMD [ "/canvas-go-service" ]
