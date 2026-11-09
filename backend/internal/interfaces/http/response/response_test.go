package response

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type sample struct {
	Name string `json:"name"`
}

func decode(body string) (sample, error) {
	var got sample
	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	err := Decode(httptest.NewRecorder(), r, &got)
	return got, err
}

func TestDecodeRejectsNUL(t *testing.T) {
	cases := []string{`{"name":"a\u0000b"}`, `{"name":"a\\\u0000b"}`}
	for _, body := range cases {
		if got, err := decode(body); err == nil {
			t.Fatalf("Decode(%s) = %+v, mau error", body, got)
		}
	}
}

func TestDecodeKeepsEscapedBackslashText(t *testing.T) {
	got, err := decode(`{"name":"a\\u0000b"}`)
	if err != nil {
		t.Fatalf("Decode error: %v", err)
	}
	if got.Name != `a\u0000b` {
		t.Fatalf("Name = %q", got.Name)
	}
}

func TestDecodeAcceptsOrdinaryJSON(t *testing.T) {
	got, err := decode(`{"name":"Budi"}`)
	if err != nil {
		t.Fatalf("Decode error: %v", err)
	}
	if got.Name != "Budi" {
		t.Fatalf("Name = %q, mau Budi", got.Name)
	}
}

func TestDecodeStillRejectsTrailingAndUnknown(t *testing.T) {
	cases := []string{`{"name":"a"}{"name":"b"}`, `{"nama":"a"}`, ``}
	for _, body := range cases {
		if got, err := decode(body); err == nil {
			t.Fatalf("Decode(%q) = %+v, mau error", body, got)
		}
	}
}
