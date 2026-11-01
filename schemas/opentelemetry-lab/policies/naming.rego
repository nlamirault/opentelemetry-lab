# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

# Naming rules for the definitions this registry adds.
#
# They apply to new definitions only. Imports and refinements of upstream
# signals keep their upstream names, and a deprecated definition keeps the name
# the apps emitted before it was replaced.
package after_resolution

import rego.v1

# A lab-defined name starts with `lab.`.
deny contains finding if {
	some def in lab_definitions
	not startswith(def.name, "lab.")
	finding := {
		"id": "lab_prefix",
		"level": "violation",
		"signal_type": def.type,
		"signal_name": def.name,
		"message": sprintf("The %s `%s` is defined by the lab, so its name must start with `lab.`.", [def.type, def.name]),
	}
}

# A lab-defined name does not live in a namespace the upstream registry owns.
# Narrow an upstream signal with a refinement instead.
deny contains finding if {
	some def in lab_definitions
	namespace := split(def.name, ".")[0]
	namespace in upstream_namespaces
	finding := {
		"id": "upstream_namespace",
		"level": "violation",
		"signal_type": def.type,
		"signal_name": def.name,
		"message": sprintf("The %s `%s` is defined in the upstream namespace `%s.`. Use a `lab.` name, or refine the upstream signal.", [def.type, def.name, namespace]),
	}
}

# The first segment of every name the dependencies define.
upstream_namespaces contains split(name, ".")[0] if {
	some dep in input.dependencies
	some name in upstream_names(dep.registry)
}

upstream_names(registry) := {a.key | some a in registry.attributes} | {m.name | some m in registry.metrics} | {s.type | some s in registry.spans} | {e.name | some e in registry.events} | {e.type | some e in registry.entities}

# Definitions this registry adds: they carry no dependency in their provenance.
# Deprecated ones are left out.
lab_definitions contains {"type": "attribute", "name": a.key} if {
	some a in input.registry.attributes
	is_new(a)
}

lab_definitions contains {"type": "metric", "name": m.name} if {
	some m in input.registry.metrics
	is_new(m)
}

lab_definitions contains {"type": "span", "name": s.type} if {
	some s in input.registry.spans
	is_new(s)
}

lab_definitions contains {"type": "event", "name": e.name} if {
	some e in input.registry.events
	is_new(e)
}

lab_definitions contains {"type": "entity", "name": e.type} if {
	some e in input.registry.entities
	is_new(e)
}

is_new(def) if {
	not def.provenance.source
	not def.deprecated
}
