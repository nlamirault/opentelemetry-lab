#!/usr/bin/env bash

watch 'curl -s http://localhost:8080/chain; curl -s http://localhost:8000/chain; curl -s http://localhost:9999/chain; curl -s http://localhost:3001/chain'
