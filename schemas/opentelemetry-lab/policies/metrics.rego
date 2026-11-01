# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

# Unit rules for the metrics this registry adds, following the semantic
# conventions naming rules: the unit lives in `unit`, never in the name.
package after_resolution

import rego.v1

# A duration is measured in seconds.
deny contains finding if {
	some m in lab_metrics
	contains(m.name, "duration")
	m.unit != "s"
	finding := {
		"id": "duration_unit",
		"level": "violation",
		"signal_type": "metric",
		"signal_name": m.name,
		"message": sprintf("The metric `%s` measures a duration, so its unit must be `s`, not `%s`.", [m.name, m.unit]),
	}
}

# The name carries no unit or type suffix: the Prometheus translation adds
# `_total` and unit suffixes itself.
deny contains finding if {
	some m in lab_metrics
	regex.match(`_(total|ms|seconds)$`, m.name)
	finding := {
		"id": "metric_name_suffix",
		"level": "violation",
		"signal_type": "metric",
		"signal_name": m.name,
		"message": sprintf("The metric `%s` ends with a unit or type suffix. Drop it and set `unit` and `instrument` instead.", [m.name]),
	}
}

lab_metrics contains m if {
	some m in input.registry.metrics
	is_new(m)
}
