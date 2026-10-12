// SPDX-License-Identifier: GPL-3.0-only
package main

import (
	"encoding/base64"
	"gitlab.com/ubports/development/core/nuntium/mms"
	"testing"
)

func TestEncodePhotoAndText(t *testing.T) {
	result, err := run(Request{Operation: "encode", Recipients: []string{"+15550199"}, Parts: []Part{{"text.txt", "text/plain", []byte("MMS test é")}, {"photo.jpg", "image/jpeg", []byte{255, 216, 255, 217}}}})
	if err != nil {
		t.Fatal(err)
	}
	data := result.(map[string]any)["data"].([]byte)
	message := mms.NewMRetrieveConf("")
	message.Type = mms.TYPE_SEND_REQ
	if err = mms.NewDecoder(data).Decode(message); err != nil {
		t.Fatal(err)
	}
	if len(message.Attachments) != 2 || string(message.Attachments[0].Data) != "MMS test é" {
		t.Fatalf("lost parts: %d", len(message.Attachments))
	}
}
func TestSendRequiresMatchingConfirmation(t *testing.T) {
	// M-Send.conf: transaction 't', MMS 1.1, status OK.
	data, _ := base64.StdEncoding.DecodeString("jIGYdACNkZKA")
	value, err := run(Request{Operation: "response", Data: data, Transaction: "t"})
	if err != nil || !value.(map[string]any)["accepted"].(bool) {
		t.Fatal(value, err)
	}
	if _, err = run(Request{Operation: "response", Data: data, Transaction: "other"}); err == nil {
		t.Fatal("accepted unrelated response")
	}
}
func TestLimits(t *testing.T) {
	if _, err := run(Request{Operation: "retrieve", Data: make([]byte, limit+1)}); err == nil {
		t.Fatal("oversize accepted")
	}
}
