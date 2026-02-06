# Feishu VC API Notes

Source: https://feishu.apifox.cn/ (Mirror)

## Endpoints

- **Apply Reservation:** `POST /open-apis/vc/v1/reserves/apply`
- **Get Reservation:** `GET /open-apis/vc/v1/reserves/{reserve_id}`
- **Update Reservation:** `PUT /open-apis/vc/v1/reserves/{reserve_id}`
- **Delete Reservation:** `DELETE /open-apis/vc/v1/reserves/{reserve_id}`

## Payload (Apply)

```json
{
  "end_time": "1655276400", // timestamp (s)
  "meeting_settings": {
    "topic": "Meeting Topic",
    "action_permissions": [{ "permission": 1, "permission_checkers": [1] }]
  },
  "owner_id": "ou_..."
}
```

Query Params: `?user_id_type=open_id`
