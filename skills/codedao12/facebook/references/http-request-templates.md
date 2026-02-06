# HTTP Request Templates (Graph API)

## Create Page post

POST `/{page-id}/feed`

```json
{
  "message": "Hello from the bot",
  "published": true
}
```

## Schedule Page post

POST `/{page-id}/feed`

```json
{
  "message": "Scheduled post",
  "published": false,
  "scheduled_publish_time": 1735689600
}
```

## Create photo post

POST `/{page-id}/photos`

```json
{
  "url": "https://example.com/image.jpg",
  "caption": "Caption",
  "published": true
}
```

## List posts

GET `/{page-id}/posts?fields=id,message,created_time,permalink_url&limit=5`

## Add comment

POST `/{post-id}/comments`

```json
{
  "message": "Thanks for your feedback!"
}
```

## Hide comment

POST `/{comment-id}`

```json
{
  "is_hidden": true
}
```

## Delete comment

DELETE `/{comment-id}`
