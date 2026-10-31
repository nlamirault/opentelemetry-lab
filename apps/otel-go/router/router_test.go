// SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
// SPDX-License-Identifier: Apache-2.0

package router_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"go.opentelemetry.io/otel"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/sdk/trace/tracetest"

	"github.com/nlamirault/otel-go/router"
	"github.com/nlamirault/otel-go/version"
)

func newTestRouter(t *testing.T) (*router.Router, *tracetest.SpanRecorder) {
	t.Helper()
	recorder := tracetest.NewSpanRecorder()
	otel.SetTracerProvider(sdktrace.NewTracerProvider(sdktrace.WithSpanProcessor(recorder)))
	r := router.New("otel-go-test")
	r.SetupRoutes()
	return r, recorder
}

func get(r *router.Router, path string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	r.Engine().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
	return rec
}

func TestVersion(t *testing.T) {
	r, _ := newTestRouter(t)

	rec := get(r, "/version")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if want := `{"version":"` + version.Version + `"}`; rec.Body.String() != want {
		t.Errorf("body = %s, want %s", rec.Body.String(), want)
	}
}

func TestHealthAndMetricsAreNotTraced(t *testing.T) {
	r, recorder := newTestRouter(t)

	for _, path := range []string{"/health", "/metrics", "/"} {
		if rec := get(r, path); rec.Code != http.StatusOK {
			t.Fatalf("GET %s: status = %d, want %d", path, rec.Code, http.StatusOK)
		}
	}

	var names []string
	for _, span := range recorder.Ended() {
		names = append(names, span.Name())
	}
	if len(names) != 1 || names[0] != "GET /" {
		t.Errorf("ended spans = %q, want only %q", names, "GET /")
	}
}

func TestChain(t *testing.T) {
	ok := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("ok"))
	}))
	defer ok.Close()
	failing := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer failing.Close()
	unreachable := httptest.NewServer(http.NotFoundHandler())
	unreachable.Close()

	tests := []struct {
		name       string
		targetTwo  string
		wantStatus int
		wantBody   string
	}{
		{"downstream services succeed", ok.URL, http.StatusOK, `{"path":"/chain"}`},
		{"downstream service returns an error", failing.URL, http.StatusBadGateway, ""},
		{"downstream service is unreachable", unreachable.URL, http.StatusBadGateway, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("TARGET_ONE_SVC", ok.URL)
			t.Setenv("TARGET_TWO_SVC", tt.targetTwo)
			r, _ := newTestRouter(t)

			rec := get(r, "/chain")
			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d (body: %s)", rec.Code, tt.wantStatus, rec.Body.String())
			}
			if tt.wantBody != "" && rec.Body.String() != tt.wantBody {
				t.Errorf("body = %s, want %s", rec.Body.String(), tt.wantBody)
			}
		})
	}
}
