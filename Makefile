# GNU Make

# Files to exclude from the package
PKG_NAME := download-notifications
MANIFEST := manifest.json
PKG_VER  := $(shell grep '"version"' $(MANIFEST) | grep -o "[0-9].[0-9].[0-9]")
PKG_OUT  := $(PKG_NAME)-$(PKG_VER).zip
EXCLUDE  := Makefile|.git|screenshots$(shell find -name "*.zip" -printf "|%P")
INCLUDE  := $(shell find . | grep -vE "$(EXCLUDE)")

all:
	zip -FS $(PKG_OUT) $(INCLUDE)
	@echo ""
	@echo "Created $(PKG_OUT)!"
