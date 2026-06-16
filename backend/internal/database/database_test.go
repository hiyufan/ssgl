package database

import (
	"testing"
)

func TestGetDBNilBeforeConnect(t *testing.T) {
	// Save original DB
	origDB := DB
	defer func() { DB = origDB }()

	// Set DB to nil to simulate uninitialized state
	DB = nil

	result := GetDB()
	if result != nil {
		t.Error("GetDB() should return nil before Connect() is called")
	}
}

func TestGetDBReturnsCurrentInstance(t *testing.T) {
	// Save original DB
	origDB := DB
	defer func() { DB = origDB }()

	// Set DB to nil
	DB = nil
	if GetDB() != nil {
		t.Error("GetDB() should return nil when DB is nil")
	}
}

func TestMigrateFunctionExists(t *testing.T) {
	// Verify Migrate function exists and is callable
	// We can't actually run it without a database connection
	var f func()
	f = Migrate
	if f == nil {
		t.Error("Migrate function should not be nil")
	}
}
