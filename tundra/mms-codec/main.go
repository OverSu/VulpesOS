// SPDX-License-Identifier: GPL-3.0-only
// This separate helper uses UBports Nuntium's MMS/WAP codecs over JSON stdin.
package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"log"
	"os"
	"strings"
	"time"

	"gitlab.com/ubports/development/core/nuntium/mms"
	"gitlab.com/ubports/development/core/nuntium/ofono"
)

const limit = 600 * 1024

type Part struct {
	ID   string `json:"id"`
	Type string `json:"type"`
	Data []byte `json:"data"`
}
type Request struct {
	Operation   string   `json:"operation"`
	Data        []byte   `json:"data"`
	Recipients  []string `json:"recipients"`
	Subject     string   `json:"subject"`
	Transaction string   `json:"transaction"`
	Parts       []Part   `json:"parts"`
}

func run(r Request) (any, error) {
	if len(r.Data) > limit {
		return nil, errors.New("MMS_TOO_LARGE")
	}
	switch r.Operation {
	case "encode":
		if len(r.Recipients) < 1 || len(r.Recipients) > 10 || len(r.Parts) > 20 {
			return nil, errors.New("INVALID_MMS")
		}
		parts := []*mms.Attachment{}
		total := 0
		for _, p := range r.Parts {
			total += len(p.Data)
			if total > limit || len(p.ID) > 100 || len(p.Type) > 100 {
				return nil, errors.New("MMS_TOO_LARGE")
			}
			parts = append(parts, &mms.Attachment{ContentId: p.ID, ContentLocation: p.ID, Name: p.ID, MediaType: p.Type, Data: p.Data})
		}
		message := mms.NewMSendReq(r.Recipients, parts, false)
		message.Subject = r.Subject
		var b bytes.Buffer
		if err := mms.NewEncoder(&b).Encode(message); err != nil {
			return nil, err
		}
		if b.Len() > limit {
			return nil, errors.New("MMS_TOO_LARGE")
		}
		return map[string]any{"data": b.Bytes(), "transaction": message.TransactionId}, nil
	case "response":
		message := mms.NewMSendConf()
		if err := mms.NewDecoder(r.Data).Decode(message); err != nil {
			return nil, err
		}
		if message.Type != mms.TYPE_SEND_CONF || message.TransactionId != r.Transaction {
			return nil, errors.New("MMS_INVALID_RESPONSE")
		}
		return map[string]any{"accepted": message.ResponseStatus == mms.ResponseStatusOk, "status": message.ResponseStatus, "messageId": message.MessageId}, nil
	case "notification":
		if len(r.Data) < 4 {
			return nil, errors.New("MMS_INVALID_PUSH")
		}
		push := &ofono.PushPDU{}
		if err := ofono.NewDecoder(r.Data).Decode(push); err != nil {
			return nil, err
		}
		if push.ApplicationId != mms.PUSH_APPLICATION_ID || push.ContentType != mms.VND_WAP_MMS_MESSAGE {
			return nil, errors.New("MMS_INVALID_PUSH")
		}
		message := mms.NewMNotificationInd(time.Now())
		if err := mms.NewDecoder(push.Data).Decode(message); err != nil {
			return nil, err
		}
		if message.Type != mms.TYPE_NOTIFICATION_IND {
			return nil, errors.New("MMS_INVALID_PUSH")
		}
		return map[string]any{"transaction": message.TransactionId, "url": message.ContentLocation, "sender": strings.Split(message.From, "/TYPE=")[0], "subject": message.Subject, "expires": message.Expiry.Unix(), "size": message.Size}, nil
	case "retrieve":
		message := mms.NewMRetrieveConf("")
		if err := mms.NewDecoder(r.Data).Decode(message); err != nil {
			return nil, err
		}
		if message.Type != mms.TYPE_RETRIEVE_CONF || (message.RetrieveStatus != 0 && message.RetrieveStatus != 128) {
			return nil, errors.New("MMS_INVALID_CONTENT")
		}
		parts := []Part{}
		for _, p := range message.Attachments {
			id := p.ContentLocation
			if id == "" {
				id = strings.Trim(p.ContentId, "<>")
			}
			parts = append(parts, Part{id, p.MediaType, p.Data})
		}
		receivers := []string{}
		for _, n := range message.To {
			receivers = append(receivers, strings.Split(n, "/TYPE=")[0])
		}
		return map[string]any{"sender": strings.Split(message.From, "/TYPE=")[0], "receivers": receivers, "subject": message.Subject, "parts": parts, "timestamp": message.Date * 1000}, nil
	case "ack":
		if r.Transaction == "" || len(r.Transaction) > 200 {
			return nil, errors.New("MMS_INVALID_TRANSACTION")
		}
		message := mms.NewMNotifyRespInd()
		message.TransactionId = r.Transaction
		message.Version = mms.MMS_MESSAGE_VERSION_1_1
		message.Status = mms.STATUS_RETRIEVED
		var b bytes.Buffer
		if err := mms.NewEncoder(&b).Encode(message); err != nil {
			return nil, err
		}
		return map[string]any{"data": b.Bytes()}, nil
	}
	return nil, errors.New("MMS_INVALID_OPERATION")
}
func main() {
	log.SetOutput(io.Discard)
	defer func() {
		if recover() != nil {
			json.NewEncoder(os.Stdout).Encode(map[string]string{"error": "MMS_INVALID_PDU"})
		}
	}()
	var r Request
	if err := json.NewDecoder(io.LimitReader(os.Stdin, 2*limit)).Decode(&r); err != nil {
		json.NewEncoder(os.Stdout).Encode(map[string]string{"error": "MMS_INVALID_REQUEST"})
		return
	}
	value, err := run(r)
	if err != nil {
		value = map[string]string{"error": "MMS_CODEC_ERROR"}
	}
	json.NewEncoder(os.Stdout).Encode(value)
}
